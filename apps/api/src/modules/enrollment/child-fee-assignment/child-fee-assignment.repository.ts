import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ChildFeeAssignmentConflictError } from './child-fee-assignment-conflict.error';
import { ChildFeeAssignmentSortField } from './dto/child-fee-assignment-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: ChildFeeAssignmentSortField;
  sortOrder: 'asc' | 'desc';
}

interface AssignData {
  feeId: string;
  effectiveFrom: string;
}

@Injectable()
export class ChildFeeAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "At most one open assignment per (child, fee)" is an inference from the
   * historized design (this entity is described as "historized like
   * Enrollment", and every other entity sharing that description -
   * Enrollment, PlanPrice, SiblingDiscountTier - enforces exactly this
   * shape) and from assign/unassign being two separate toggle-style actions
   * rather than a combined setX - NOT a rule either frozen document states
   * outright. The schema doesn't back it either: no unique index, partial
   * or otherwise, exists on child_fee_assignments (verified by grepping
   * every migration). Enforced here at the application layer only via the
   * pre-check below; a genuinely concurrent pair of first-time assigns for
   * the same (child, fee) can still both pass it, since there is no DB
   * constraint to serialize against - documented as tech debt, same class
   * as plan_fees' missing constraint.
   */
  assign(tenantId: string, childId: string, data: AssignData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', childId, () =>
        tx.child.findFirst({ where: { id: childId, tenantId, deletedAt: null } }),
      );

      const fee = await findOrThrow('Fee', data.feeId, () =>
        tx.fee.findFirst({ where: { id: data.feeId, tenantId, deletedAt: null } }),
      );
      if (!fee.isActive) {
        throw new ChildFeeAssignmentConflictError('This Fee is inactive and cannot be newly assigned');
      }

      const existingOpen = await tx.childFeeAssignment.findFirst({
        where: { tenantId, childId, feeId: data.feeId, effectiveTo: null, deletedAt: null },
      });
      if (existingOpen) {
        throw new ChildFeeAssignmentConflictError('This Fee is already assigned to this Child');
      }

      return tx.childFeeAssignment.create({
        data: {
          tenantId,
          childId,
          feeId: data.feeId,
          snapshotAmount: fee.amount,
          effectiveFrom: new Date(data.effectiveFrom.slice(0, 10)),
          createdBy,
        },
      });
    });
  }

  unassign(tenantId: string, childId: string, feeId: string, effectiveTo: string, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      // Normalize to a calendar date before any comparison - the same bug
      // class already fixed in EnrollmentBillingTermsService,
      // PlanPriceService, and SiblingDiscountTierService.
      const newEffectiveTo = new Date(effectiveTo.slice(0, 10));

      const current = await tx.childFeeAssignment.findFirst({
        where: { tenantId, childId, feeId, effectiveTo: null, deletedAt: null },
      });
      if (current && newEffectiveTo <= current.effectiveFrom) {
        throw new ChildFeeAssignmentConflictError("effectiveTo must be after this assignment's own effectiveFrom");
      }

      // Guarded close: keyed by the natural key, not a previously-read row
      // id, so a concurrent unassign for the same (child, fee) either
      // serializes cleanly or the loser gets a count-0 conflict - same
      // proven pattern as SiblingDiscountTierRepository's fix, fully
      // race-safe here with no missing constraint to work around (unlike
      // assign's residual gap above).
      const { count } = await tx.childFeeAssignment.updateMany({
        where: { tenantId, childId, feeId, effectiveTo: null, deletedAt: null },
        data: { effectiveTo: newEffectiveTo, updatedBy },
      });
      if (count === 0) {
        throw new ChildFeeAssignmentConflictError('This Fee is not currently assigned to this Child');
      }
    });
  }

  findForChild(tenantId: string, childId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', childId, () =>
        tx.child.findFirst({ where: { id: childId, tenantId, deletedAt: null } }),
      );

      const where: Prisma.ChildFeeAssignmentWhereInput = { tenantId, childId, deletedAt: null };

      const [items, total] = await Promise.all([
        tx.childFeeAssignment.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.childFeeAssignment.count({ where }),
      ]);

      return { items, total };
    });
  }

  /**
   * Period-overlap resolution (never "currently open"), matching the
   * billing-period invariant domain-model.md states for BillingRun/PlanPrice/
   * SiblingDiscountTier resolution. Composable (optional tx) - primarily
   * called by PricingEngineService, later. No Child-existence check here,
   * unlike findForChild - the caller has already validated childId
   * upstream, and an empty array (no fees assigned) is a valid result, not
   * an error.
   */
  findEffectiveForPeriod(
    tenantId: string,
    childId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = (client: Prisma.TransactionClient) => {
      const periodStartValue = new Date(periodStart.slice(0, 10));
      const periodEndValue = new Date(periodEnd.slice(0, 10));
      return client.childFeeAssignment.findMany({
        where: {
          tenantId,
          childId,
          deletedAt: null,
          effectiveFrom: { lte: periodEndValue },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStartValue } }],
        },
        orderBy: { effectiveFrom: 'asc' },
      });
    };
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }
}
