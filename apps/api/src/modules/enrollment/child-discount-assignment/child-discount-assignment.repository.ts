import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ChildDiscountAssignmentConflictError } from './child-discount-assignment-conflict.error';
import { ChildDiscountAssignmentSortField } from './dto/child-discount-assignment-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: ChildDiscountAssignmentSortField;
  sortOrder: 'asc' | 'desc';
}

interface AssignData {
  discountId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

@Injectable()
export class ChildDiscountAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "At most one open assignment per (child, discount)" - and specifically
   * whether that also blocks a *new, already-closed* assignment (a bounded
   * promo) - is an ENGINEERING INTERPRETATION, not a frozen-document
   * requirement. Neither domain-model.md nor
   * configuration-engine-backend-services.md states this rule for
   * ChildDiscountAssignment; unlike ChildFeeAssignment (explicitly
   * "historized like Enrollment"), this entity's own entry drops that
   * comparison, so the analogy here is weaker still. The decision - reject
   * ANY new assignment (open or pre-closed) for a pair that already has an
   * open row - was made explicitly for this service, confirmed with the
   * user rather than assumed. No DB constraint backs it either way (no
   * unique index exists on child_discount_assignments - confirmed by
   * grepping every migration), so this is enforced at the application
   * layer only.
   */
  assign(tenantId: string, childId: string, data: AssignData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', childId, () =>
        tx.child.findFirst({ where: { id: childId, tenantId, deletedAt: null } }),
      );

      const discount = await findOrThrow('Discount', data.discountId, () =>
        tx.discount.findFirst({ where: { id: data.discountId, tenantId, deletedAt: null } }),
      );
      if (!discount.isActive) {
        throw new ChildDiscountAssignmentConflictError('This Discount is inactive and cannot be newly assigned');
      }

      const newEffectiveFrom = new Date(data.effectiveFrom.slice(0, 10));

      // Not a frozen-document rule - basic date-range sanity, inferred by
      // analogy to every other effectiveFrom/effectiveTo pair in this
      // codebase, applied here since assign() (unlike ChildFeeAssignment's)
      // can receive an effectiveTo at creation time.
      if (data.effectiveTo !== undefined) {
        const newEffectiveTo = new Date(data.effectiveTo.slice(0, 10));
        if (newEffectiveTo <= newEffectiveFrom) {
          throw new ChildDiscountAssignmentConflictError('effectiveTo must be after effectiveFrom');
        }
      }

      const existingOpen = await tx.childDiscountAssignment.findFirst({
        where: { tenantId, childId, discountId: data.discountId, effectiveTo: null, deletedAt: null },
      });
      if (existingOpen) {
        throw new ChildDiscountAssignmentConflictError('This Discount is already assigned to this Child');
      }

      return tx.childDiscountAssignment.create({
        data: {
          tenantId,
          childId,
          discountId: data.discountId,
          snapshotAmount: discount.amount,
          effectiveFrom: newEffectiveFrom,
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo.slice(0, 10)) : undefined,
          createdBy,
        },
      });
    });
  }

  expire(tenantId: string, childId: string, discountId: string, effectiveTo: string, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      // Calendar-day normalization - the same bug class already fixed in
      // EnrollmentBillingTermsService, PlanPriceService,
      // SiblingDiscountTierService, and ChildFeeAssignmentService.
      const newEffectiveTo = new Date(effectiveTo.slice(0, 10));

      const current = await tx.childDiscountAssignment.findFirst({
        where: { tenantId, childId, discountId, effectiveTo: null, deletedAt: null },
      });
      if (current && newEffectiveTo <= current.effectiveFrom) {
        throw new ChildDiscountAssignmentConflictError("effectiveTo must be after this assignment's own effectiveFrom");
      }

      // Guarded close: keyed by the natural key, not a previously-read row
      // id - same proven pattern as ChildFeeAssignmentRepository.unassign/
      // SiblingDiscountTierRepository, fully race-safe with no missing
      // constraint to work around (unlike assign's residual gap above).
      const { count } = await tx.childDiscountAssignment.updateMany({
        where: { tenantId, childId, discountId, effectiveTo: null, deletedAt: null },
        data: { effectiveTo: newEffectiveTo, updatedBy },
      });
      // Returning a conflict here (rather than treating "nothing open" as a
      // silent no-op) is a PROJECT CONVENTION carried forward from
      // ChildFeeAssignmentService.unassign, not a frozen-document
      // requirement - neither document states how this case should behave
      // for either entity.
      if (count === 0) {
        throw new ChildDiscountAssignmentConflictError('This Discount is not currently assigned to this Child');
      }
    });
  }

  findForChild(tenantId: string, childId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', childId, () =>
        tx.child.findFirst({ where: { id: childId, tenantId, deletedAt: null } }),
      );

      const where: Prisma.ChildDiscountAssignmentWhereInput = { tenantId, childId, deletedAt: null };

      const [items, total] = await Promise.all([
        tx.childDiscountAssignment.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.childDiscountAssignment.count({ where }),
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
   * upstream, and an empty array (no discounts assigned) is a valid
   * result, not an error.
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
      return client.childDiscountAssignment.findMany({
        where: {
          tenantId,
          childId,
          deletedAt: null,
          effectiveFrom: { lte: periodEndValue },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStartValue } }],
        },
        // Added for PricingEngineService - Discount.type/scope/stackable
        // aren't snapshotted onto the assignment, only its amount is.
        include: { discount: true },
        orderBy: { effectiveFrom: 'asc' },
      });
    };
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }
}
