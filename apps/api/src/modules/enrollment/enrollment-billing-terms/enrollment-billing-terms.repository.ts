import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { CapacityService } from '../capacity/capacity.service';
import { EnrollmentBillingTermsConflictError } from './enrollment-billing-terms-conflict.error';

const OCCUPIED_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

interface TermsData {
  planId?: string;
  billingGuardianId: string;
  customRateAmount?: number;
  customRateReason?: string;
  depositAmount?: number;
  depositRefundPolicy?: string;
  withdrawalNoticeGivenDate?: string;
}

interface ChangeTermsData extends Partial<TermsData> {
  effectiveFrom: string;
  immediate?: boolean;
  reasonCode?: string;
  reasonNote?: string;
}

@Injectable()
export class EnrollmentBillingTermsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacity: CapacityService,
  ) {}

  // ---- Composable methods - required tx, called by EnrollmentRepository inside its own transaction ----

  async openWithEnrollment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    enrollmentId: string,
    data: TermsData,
    createdBy: string,
    validateReferences = true,
  ) {
    // validateReferences=false is for carrying forward an unchanged
    // Plan/Guardian (EnrollmentRepository.transfer's carry-forward) - not a
    // new assignment, so a since-deactivated Plan or soft-deleted Guardian
    // must not block it (domain-model.md's soft-delete cascade policy: only
    // *new* assignment against an inactive Plan is blocked).
    if (validateReferences) {
      await this.validateGuardianAndPlan(tx, tenantId, data.billingGuardianId, data.planId);
    }

    return tx.enrollmentBillingTerms.create({
      data: {
        tenantId,
        enrollmentId,
        planId: data.planId,
        billingGuardianId: data.billingGuardianId,
        customRateAmount: data.customRateAmount,
        customRateReason: data.customRateReason,
        depositAmount: data.depositAmount,
        depositRefundPolicy: data.depositRefundPolicy,
        withdrawalNoticeGivenDate: data.withdrawalNoticeGivenDate
          ? new Date(data.withdrawalNoticeGivenDate)
          : undefined,
        createdBy,
      },
    });
  }

  /**
   * No-op (returns null) if the enrollment has no billing terms - billing
   * terms are optional (see openWithEnrollment). Returns the closed row so
   * callers (EnrollmentRepository.transfer's carry-forward) can reuse its
   * values without a second read.
   */
  async closeWithEnrollment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    enrollmentId: string,
    effectiveTo: Date,
    deletedBy: string,
  ) {
    const current = await tx.enrollmentBillingTerms.findFirst({
      where: { tenantId, enrollmentId, deletedAt: null },
    });
    if (!current) {
      return null;
    }
    return tx.enrollmentBillingTerms.update({
      where: { id: current.id },
      data: { deletedAt: effectiveTo, deletedBy },
    });
  }

  // ---- Entry-point / mixed methods ----

  findCurrent(tenantId: string, enrollmentId: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('EnrollmentBillingTerms', enrollmentId, () =>
        tx.enrollmentBillingTerms.findFirst({ where: { tenantId, enrollmentId, deletedAt: null } }),
      ),
    );
  }

  changeTerms(tenantId: string, enrollmentId: string, data: ChangeTermsData, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const currentTerms = await findOrThrow('EnrollmentBillingTerms', enrollmentId, () =>
        tx.enrollmentBillingTerms.findFirst({ where: { tenantId, enrollmentId, deletedAt: null } }),
      );
      const currentEnrollment = await findOrThrow('Enrollment', enrollmentId, () =>
        tx.enrollment.findFirst({ where: { id: enrollmentId, tenantId, deletedAt: null } }),
      );

      if (currentEnrollment.endDate !== null) {
        throw new EnrollmentBillingTermsConflictError('Enrollment already closed');
      }

      const effectiveFrom = new Date(data.effectiveFrom);
      const immediate = data.immediate === true;

      if (!immediate) {
        // Compare calendar dates, not raw strings - effectiveFrom may arrive
        // as a full ISO datetime (@IsDateString() accepts either), and a
        // same-day value with a time component would otherwise sort after a
        // bare "today" string and be wrongly treated as future-dated.
        const todayIsoDate = new Date().toISOString().slice(0, 10);
        const effectiveFromIsoDate = data.effectiveFrom.slice(0, 10);
        if (effectiveFromIsoDate <= todayIsoDate) {
          throw new EnrollmentBillingTermsConflictError(
            'A standard billing-terms change must be dated in the future - use immediate for a mid-cycle change',
          );
        }
      }

      const nextPlanId = data.planId !== undefined ? data.planId : (currentTerms.planId ?? undefined);
      const nextBillingGuardianId = data.billingGuardianId ?? currentTerms.billingGuardianId;

      // Only re-validate a reference that's actually changing to something new -
      // carrying forward an unchanged Plan/Guardian must not be blocked by it
      // having since been deactivated/soft-deleted (same soft-delete cascade
      // policy as openWithEnrollment's validateReferences=false path).
      if (data.billingGuardianId !== undefined && data.billingGuardianId !== currentTerms.billingGuardianId) {
        await this.validateGuardian(tx, tenantId, nextBillingGuardianId);
      }
      if (data.planId !== undefined && data.planId !== currentTerms.planId) {
        await this.validatePlanActive(tx, tenantId, data.planId);
      }

      // Guarded close: only succeeds if still open - same TOCTOU-safe pattern EnrollmentRepository.transfer/withdraw already use.
      const { count } = await tx.enrollment.updateMany({
        where: { id: enrollmentId, endDate: null },
        data: { endDate: effectiveFrom, endedReason: 'Billing terms changed', updatedBy: actorId },
      });
      if (count === 0) {
        throw new EnrollmentBillingTermsConflictError('Enrollment already closed');
      }

      await tx.enrollmentBillingTerms.update({
        where: { id: currentTerms.id },
        data: { deletedAt: new Date(), deletedBy: actorId },
      });

      // Same classroom as before - re-validated anyway, per domain-model.md: "A Plan change is subject to the
      // same capacity validation as a new enrollment... never exempt just because the child is already enrolled
      // elsewhere." Checked AFTER closing the old Enrollment row so this child's own vacated seat isn't counted
      // against them (checking before would incorrectly block a pure billing-only change in an at-capacity room).
      if (currentEnrollment.classroomId) {
        await this.capacity.assertCapacityAvailable(tx, tenantId, currentEnrollment.classroomId);
      }

      const newEnrollment = await tx.enrollment.create({
        data: {
          tenantId,
          childId: currentEnrollment.childId,
          classroomId: currentEnrollment.classroomId,
          status: currentEnrollment.status,
          startDate: effectiveFrom,
          createdReason: 'Billing terms changed',
          createdBy: actorId,
        },
      });

      const newTerms = await tx.enrollmentBillingTerms.create({
        data: {
          tenantId,
          enrollmentId: newEnrollment.id,
          planId: nextPlanId,
          billingGuardianId: nextBillingGuardianId,
          customRateAmount:
            data.customRateAmount !== undefined ? data.customRateAmount : (currentTerms.customRateAmount ?? undefined),
          customRateReason:
            data.customRateReason !== undefined ? data.customRateReason : (currentTerms.customRateReason ?? undefined),
          depositAmount: data.depositAmount !== undefined ? data.depositAmount : (currentTerms.depositAmount ?? undefined),
          depositRefundPolicy:
            data.depositRefundPolicy !== undefined
              ? data.depositRefundPolicy
              : (currentTerms.depositRefundPolicy ?? undefined),
          withdrawalNoticeGivenDate: data.withdrawalNoticeGivenDate
            ? new Date(data.withdrawalNoticeGivenDate)
            : (currentTerms.withdrawalNoticeGivenDate ?? undefined),
          createdBy: actorId,
        },
      });

      if (immediate) {
        await tx.manualOverride.create({
          data: {
            tenantId,
            overrideType: 'PLAN_CHANGE_IMMEDIATE',
            reasonCode: data.reasonCode!,
            reasonNote: data.reasonNote,
            relatedEntityType: 'EnrollmentBillingTerms',
            relatedEntityId: newTerms.id,
            previousValue: JSON.stringify({
              planId: currentTerms.planId,
              billingGuardianId: currentTerms.billingGuardianId,
              customRateAmount: currentTerms.customRateAmount,
            }),
            newValue: JSON.stringify({
              planId: newTerms.planId,
              billingGuardianId: newTerms.billingGuardianId,
              customRateAmount: newTerms.customRateAmount,
            }),
            appliedBy: actorId,
            appliedAt: new Date(),
            createdBy: actorId,
          },
        });
      }

      return newTerms;
    });
  }

  /** Period-overlap resolution, not "currently open" - resolves via the paired Enrollment segment's startDate/endDate, since EnrollmentBillingTerms carries no date fields of its own. */
  findEffectiveForPeriod(
    tenantId: string,
    enrollmentId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = (client: Prisma.TransactionClient) =>
      this.resolveEffectiveForPeriod(client, tenantId, enrollmentId, periodStart, periodEnd);
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }

  private async resolveEffectiveForPeriod(
    tx: Prisma.TransactionClient,
    tenantId: string,
    enrollmentId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const anchor = await findOrThrow('Enrollment', enrollmentId, () =>
      tx.enrollment.findFirst({ where: { id: enrollmentId, tenantId, deletedAt: null } }),
    );

    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);

    const segment = await tx.enrollment.findFirst({
      where: {
        tenantId,
        childId: anchor.childId,
        deletedAt: null,
        startDate: { lt: periodEndDate },
        OR: [{ endDate: null }, { endDate: { gt: periodStartDate } }],
      },
    });

    if (!segment) {
      return null;
    }

    return tx.enrollmentBillingTerms.findFirst({ where: { tenantId, enrollmentId: segment.id } });
  }

  /** Counts distinct children under this billing guardian with an ACTIVE/SUSPENDED Enrollment overlapping the period - the read SiblingDiscountTier resolution (a later service) depends on. */
  countEligibleSiblings(
    tenantId: string,
    billingGuardianId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = (client: Prisma.TransactionClient) =>
      this.resolveEligibleSiblings(client, tenantId, billingGuardianId, periodStart, periodEnd);
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }

  private async resolveEligibleSiblings(
    tx: Prisma.TransactionClient,
    tenantId: string,
    billingGuardianId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<number> {
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);

    const overlapping = await tx.enrollment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: [...OCCUPIED_STATUSES] },
        startDate: { lt: periodEndDate },
        OR: [{ endDate: null }, { endDate: { gt: periodStartDate } }],
        billingTerms: { some: { billingGuardianId } },
      },
      select: { childId: true },
      distinct: ['childId'],
    });

    return overlapping.length;
  }

  private async validateGuardianAndPlan(
    tx: Prisma.TransactionClient,
    tenantId: string,
    billingGuardianId: string,
    planId: string | undefined,
  ): Promise<void> {
    await this.validateGuardian(tx, tenantId, billingGuardianId);
    if (planId) {
      await this.validatePlanActive(tx, tenantId, planId);
    }
  }

  private async validateGuardian(tx: Prisma.TransactionClient, tenantId: string, billingGuardianId: string): Promise<void> {
    await findOrThrow('Guardian', billingGuardianId, () =>
      tx.guardian.findFirst({ where: { id: billingGuardianId, tenantId, deletedAt: null } }),
    );
  }

  private async validatePlanActive(tx: Prisma.TransactionClient, tenantId: string, planId: string): Promise<void> {
    const plan = await findOrThrow('Plan', planId, () =>
      tx.plan.findFirst({ where: { id: planId, tenantId, deletedAt: null } }),
    );
    if (!plan.isActive) {
      throw new EnrollmentBillingTermsConflictError(`Plan ${planId} is not active`);
    }
  }
}
