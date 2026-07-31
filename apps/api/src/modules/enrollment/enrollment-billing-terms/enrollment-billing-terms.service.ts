import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChangeBillingTermsDto } from './dto/change-billing-terms.dto';
import { EnrollmentBillingTermsConflictError } from './enrollment-billing-terms-conflict.error';
import { EnrollmentBillingTermsRepository } from './enrollment-billing-terms.repository';

interface OpenBillingTermsData {
  planId?: string;
  billingGuardianId: string;
  customRateAmount?: number;
  customRateReason?: string;
  depositAmount?: number;
  depositRefundPolicy?: string;
  withdrawalNoticeGivenDate?: string;
}

@Injectable()
export class EnrollmentBillingTermsService {
  constructor(
    private readonly repository: EnrollmentBillingTermsRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  /**
   * Composable - called by EnrollmentRepository inside its own create
   * transaction, never opens one itself. Explicit tenantId: this is a
   * repository-to-service call, not a controller-to-service one, so
   * there's no request-scoped tenant to resolve. validateReferences=false
   * is for carrying forward an unchanged Plan/Guardian (transfer's
   * carry-forward) - see the repository for why.
   */
  openWithEnrollment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    enrollmentId: string,
    data: OpenBillingTermsData,
    createdBy: string,
    validateReferences = true,
  ) {
    return this.repository.openWithEnrollment(tx, tenantId, enrollmentId, data, createdBy, validateReferences);
  }

  /** Composable - called by EnrollmentRepository inside its own transfer/withdraw transaction. Returns the closed row (or null if the enrollment had no billing terms) so transfer's carry-forward can reuse its values. */
  closeWithEnrollment(tx: Prisma.TransactionClient, tenantId: string, enrollmentId: string, effectiveTo: Date, deletedBy: string) {
    return this.repository.closeWithEnrollment(tx, tenantId, enrollmentId, effectiveTo, deletedBy);
  }

  findCurrent(enrollmentId: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findCurrent(tenantId, enrollmentId).catch(translateNotFound);
  }

  changeTerms(enrollmentId: string, dto: ChangeBillingTermsDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.changeTerms(tenantId, enrollmentId, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Child already has an active enrollment');
      }
      return this.translateConflict(error);
    });
  }

  /** Composable (optional tx) - primarily called by other services (PricingEngineService, later), not directly by a controller. Explicit tenantId, matching PlanPriceService.findEffective's exact convention. */
  findEffectiveForPeriod(
    tenantId: string,
    enrollmentId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repository.findEffectiveForPeriod(tenantId, enrollmentId, periodStart, periodEnd, tx);
  }

  /** Composable (optional tx) - PricingEngineService's entry point, since it only has a childId, not an enrollmentId. See the repository for why this can't just be findEffectiveForPeriod with an extra lookup. */
  findEffectiveForChildAndPeriod(
    tenantId: string,
    childId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repository.findEffectiveForChildAndPeriod(tenantId, childId, periodStart, periodEnd, tx);
  }

  /** Composable (optional tx) - the read SiblingDiscountTier resolution (a later service) depends on. */
  countEligibleSiblings(
    tenantId: string,
    billingGuardianId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repository.countEligibleSiblings(tenantId, billingGuardianId, periodStart, periodEnd, tx);
  }

  /** Composable (optional tx) - returns the eligible sibling list itself, not just the count. Not yet consumed anywhere: PricingEngineService stops short of selecting which sibling(s) receive a SiblingDiscountTier reduction, a business rule the frozen documents don't define - see PricingEngineService for the full explanation. */
  findEligibleSiblingsForPeriod(
    tenantId: string,
    billingGuardianId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repository.findEligibleSiblingsForPeriod(tenantId, billingGuardianId, periodStart, periodEnd, tx);
  }

  private translateConflict(error: unknown): never {
    if (error instanceof EnrollmentBillingTermsConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
