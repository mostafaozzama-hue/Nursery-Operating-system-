import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { PrismaService } from '../../../prisma/prisma.service';
import { SiblingDiscountTierConflictError } from './sibling-discount-tier-conflict.error';
import { SiblingDiscountTierSortField } from './dto/sibling-discount-tier-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: SiblingDiscountTierSortField;
  sortOrder: 'asc' | 'desc';
}

interface SetTierData {
  siblingCountThreshold: number;
  discountPercentage: number;
  effectiveFrom: string;
}

/**
 * The calendar day immediately before the given date, in UTC - never local
 * setters, same convention as plan-price.repository.ts's identical helper
 * and for the same reason: a @db.Date column's day boundary must never
 * shift by the server's own timezone.
 */
function dayBefore(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

@Injectable()
export class SiblingDiscountTierRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Historizes exactly like PlanPrice, per domain-model.md: closes the
   * current open-ended tier for this threshold and opens a new one, in one
   * transaction - but with a fuller race fix than PlanPriceRepository.setPrice
   * has today (documented tech debt there, not fixed):
   *
   * 1. The close step is a *guarded* updateMany keyed by the natural key
   *    (tenantId, siblingCountThreshold, effectiveTo: null) rather than a
   *    previously-read row's id - re-evaluated at lock-acquisition time, so
   *    a concurrent setTier for the same threshold either serializes
   *    cleanly or the loser gets a count-0 conflict, never a silent
   *    duplicate racing the partial unique index later.
   * 2. The brand-new-threshold case (no existing open row to guard
   *    against at all) still races on the final create - closed by
   *    SiblingDiscountTierService.setTier catching
   *    isUniqueConstraintViolation, the one piece neither PlanPriceService
   *    nor EnrollmentBillingTermsService's own equivalent race has today.
   */
  setTier(tenantId: string, data: SetTierData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      // Normalize to a calendar date (UTC midnight) before any comparison -
      // effectiveFrom may arrive as a full ISO datetime (@IsDateString()
      // accepts either), and a same-calendar-day value with a nonzero
      // time-of-day must not be treated as "after" the current period's
      // own (always midnight-normalized, @db.Date) effectiveFrom. The exact
      // bug class already fixed once in EnrollmentBillingTermsService and
      // once in PlanPriceService.
      const newEffectiveFrom = new Date(data.effectiveFrom.slice(0, 10));

      const currentOpen = await tx.siblingDiscountTier.findFirst({
        where: { tenantId, siblingCountThreshold: data.siblingCountThreshold, effectiveTo: null, deletedAt: null },
      });

      if (currentOpen) {
        if (newEffectiveFrom <= currentOpen.effectiveFrom) {
          throw new SiblingDiscountTierConflictError(
            "effectiveFrom must be after the current tier period's own effectiveFrom",
          );
        }

        const { count } = await tx.siblingDiscountTier.updateMany({
          where: { tenantId, siblingCountThreshold: data.siblingCountThreshold, effectiveTo: null, deletedAt: null },
          data: { effectiveTo: dayBefore(newEffectiveFrom), updatedBy: createdBy },
        });
        if (count === 0) {
          throw new SiblingDiscountTierConflictError('This tier was changed concurrently - please retry');
        }
      }

      return tx.siblingDiscountTier.create({
        data: {
          tenantId,
          siblingCountThreshold: data.siblingCountThreshold,
          discountPercentage: data.discountPercentage,
          effectiveFrom: newEffectiveFrom,
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.SiblingDiscountTierWhereInput = { tenantId, deletedAt: null };

      const [items, total] = await Promise.all([
        tx.siblingDiscountTier.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.siblingDiscountTier.count({ where }),
      ]);

      return { items, total };
    });
  }

  /**
   * All tiers (across every threshold) effective on asOfDate, ascending -
   * a plain array, not a single-row resolution like
   * PlanPriceRepository.findEffective, since several thresholds can be
   * simultaneously effective. An empty array is a valid result (no tiers
   * configured yet), never a not-found error.
   */
  findEffective(tenantId: string, asOfDate: string, tx?: Prisma.TransactionClient) {
    const run = (client: Prisma.TransactionClient) => {
      const asOfDateValue = new Date(asOfDate);
      return client.siblingDiscountTier.findMany({
        where: {
          tenantId,
          deletedAt: null,
          effectiveFrom: { lte: asOfDateValue },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOfDateValue } }],
        },
        orderBy: { siblingCountThreshold: 'asc' },
      });
    };
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }
}
