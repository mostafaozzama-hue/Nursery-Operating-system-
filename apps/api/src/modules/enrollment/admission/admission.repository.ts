import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ChildDiscountAssignmentRepository } from '../child-discount-assignment/child-discount-assignment.repository';
import { ChildFeeAssignmentRepository } from '../child-fee-assignment/child-fee-assignment.repository';
import { ChildGuardianRepository } from '../child-guardian/child-guardian.repository';
import { ChildRepository } from '../child/child.repository';
import { EnrollmentRepository } from '../enrollment/enrollment.repository';
import { GuardianRepository } from '../guardian/guardian.repository';
import { WaiverRepository } from '../waiver/waiver.repository';
import { AdmissionGuardianInputDto, CreateAdmissionDto } from './dto/create-admission.dto';

/**
 * Orchestration-only (Easy Enrollment, Product Gap H): every insert below is
 * the same createWithinTx primitive POST /children, POST /guardians,
 * POST /child-guardians and POST /enrollments already use internally - this
 * repository adds no new business rule of its own, it only sequences the
 * existing ones inside one shared transaction so the whole admission commits
 * or rolls back together. See ChildRepository.createWithinTx's doc comment
 * for the pattern this mirrors (EnrollmentBillingTermsRepository.
 * openWithEnrollment).
 */
@Injectable()
export class AdmissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly childRepository: ChildRepository,
    private readonly guardianRepository: GuardianRepository,
    private readonly childGuardianRepository: ChildGuardianRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly childFeeAssignmentRepository: ChildFeeAssignmentRepository,
    private readonly childDiscountAssignmentRepository: ChildDiscountAssignmentRepository,
    private readonly waiverRepository: WaiverRepository,
  ) {}

  create(tenantId: string, data: CreateAdmissionDto, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const child = await this.childRepository.createWithinTx(tx, tenantId, data.child, createdBy);

      const guardians = [];
      for (const guardianInput of data.guardians) {
        const guardian = await this.resolveGuardian(tx, tenantId, guardianInput, createdBy);

        await this.childGuardianRepository.createWithinTx(
          tx,
          tenantId,
          {
            childId: child.id,
            guardianId: guardian.id,
            relationshipType: guardianInput.relationshipType,
            isPrimaryContact: guardianInput.isPrimaryContact,
            isEmergencyContact: guardianInput.isEmergencyContact,
            canPickup: guardianInput.canPickup,
          },
          createdBy,
        );

        guardians.push(guardian);
      }

      const enrollment = await this.enrollmentRepository.createWithinTx(
        tx,
        tenantId,
        {
          childId: child.id,
          classroomId: data.classroomId,
          createdReason: data.createdReason,
          plannedEndDate: data.plannedEndDate,
          billingTerms: data.billingTerms,
        },
        createdBy,
      );

      // Fees & Billing step (Easy Enrollment, Product Gap H phase 2) - each
      // reuses its existing createWithinTx primitive unchanged, so every
      // existing rule (inactive-Fee/Discount rejection, already-assigned
      // conflicts, the exclusive-discount and duplicate-waiver bug fixes)
      // applies exactly as it does through the standalone endpoints.
      // effectiveFrom is always today, matching Enrollment.startDate's own
      // "always now" convention - never asked in the wizard.
      const today = new Date().toISOString().slice(0, 10);

      for (const feeId of data.feeIds ?? []) {
        await this.childFeeAssignmentRepository.assignWithinTx(
          tx,
          tenantId,
          child.id,
          { feeId, effectiveFrom: today },
          createdBy,
        );
      }

      if (data.discount) {
        await this.childDiscountAssignmentRepository.assignWithinTx(
          tx,
          tenantId,
          child.id,
          { discountId: data.discount.discountId, effectiveFrom: today, effectiveTo: data.discount.effectiveTo },
          createdBy,
        );
      }

      if (data.waiver) {
        await this.waiverRepository.createWithinTx(
          tx,
          tenantId,
          child.id,
          { ...data.waiver, effectiveFrom: today },
          createdBy,
        );
      }

      return { child, guardians, enrollment };
    });
  }

  /**
   * guardianId present -> reuse that existing, tenant-scoped Guardian
   * (prevents the duplicate-guardian record this feature is explicitly meant
   * to avoid). Otherwise create a new one via the same createWithinTx
   * GuardianService.create itself delegates to, so membership/uniqueness
   * checks are identical either way.
   */
  private resolveGuardian(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: AdmissionGuardianInputDto,
    createdBy: string,
  ) {
    if (input.guardianId) {
      const guardianId = input.guardianId;
      return findOrThrow('Guardian', guardianId, () =>
        tx.guardian.findFirst({ where: { id: guardianId, tenantId, deletedAt: null } }),
      );
    }

    return this.guardianRepository.createWithinTx(
      tx,
      tenantId,
      {
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
        phone: input.phone,
        email: input.email,
        address: input.address,
      },
      createdBy,
    );
  }
}
