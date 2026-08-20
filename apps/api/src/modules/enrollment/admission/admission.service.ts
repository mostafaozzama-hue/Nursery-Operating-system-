import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CapacityExceededError } from '../../../common/errors/capacity-exceeded.error';
import { InactiveMembershipError } from '../../../common/errors/inactive-membership.error';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { ChildGuardianConflictError } from '../child-guardian/child-guardian-conflict.error';
import { EnrollmentBillingTermsConflictError } from '../enrollment-billing-terms/enrollment-billing-terms-conflict.error';
import { EnrollmentConflictError } from '../enrollment/enrollment-conflict.error';
import { GuardianConflictError } from '../guardian/guardian-conflict.error';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { AdmissionRepository } from './admission.repository';
import { AdmissionGuardianInputDto, CreateAdmissionDto } from './dto/create-admission.dto';

/**
 * Orchestration layer only (Easy Enrollment, Product Gap H) - see
 * AdmissionRepository's doc comment. The one rule enforced here rather than
 * reused from GuardianService is the "new guardian needs a phone or email"
 * check: AdmissionRepository calls GuardianRepository.createWithinTx
 * directly (bypassing GuardianService, which only that check lives in as an
 * explicit BadRequestException - see CreateGuardianDto's own comment on why
 * this codebase keeps cross-field rules like it in the service layer). Every
 * other rule - capacity, uniqueness, primary-contact, membership, RLS -
 * still runs unchanged inside the repositories being composed.
 */
@Injectable()
export class AdmissionService {
  constructor(
    private readonly repository: AdmissionRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  async create(dto: CreateAdmissionDto) {
    this.validateGuardians(dto.guardians);

    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    try {
      return await this.repository.create(tenantId, dto, userId);
    } catch (error) {
      return this.translateError(error);
    }
  }

  private validateGuardians(guardians: AdmissionGuardianInputDto[]): void {
    guardians.forEach((guardian, index) => {
      const isExisting = guardian.guardianId != null;
      const hasNewGuardianName = !!guardian.firstName && !!guardian.lastName;

      if (isExisting === hasNewGuardianName) {
        throw new BadRequestException(
          `Guardian #${index + 1}: provide either an existing guardianId or a new guardian's firstName and lastName, not both or neither`,
        );
      }

      if (!isExisting && !guardian.phone && !guardian.email) {
        throw new BadRequestException(
          `Guardian #${index + 1}: provide at least a phone number or an email address for a new guardian`,
        );
      }
    });
  }

  private translateError(error: unknown): never {
    if (error instanceof InactiveMembershipError) {
      throw new BadRequestException(error.message);
    }
    if (
      error instanceof GuardianConflictError ||
      error instanceof ChildGuardianConflictError ||
      error instanceof EnrollmentConflictError ||
      error instanceof EnrollmentBillingTermsConflictError ||
      error instanceof CapacityExceededError
    ) {
      throw new ConflictException(error.message);
    }
    if (isUniqueConstraintViolation(error)) {
      throw new ConflictException('This enrollment could not be created due to a conflicting record - please retry');
    }
    return translateNotFound(error);
  }
}
