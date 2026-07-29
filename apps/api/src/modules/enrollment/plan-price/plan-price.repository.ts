import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { PlanPriceConflictError } from './plan-price-conflict.error';
import { PlanPriceSortField } from './dto/plan-price-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: PlanPriceSortField;
  sortOrder: 'asc' | 'desc';
}

interface SetPriceData {
  amount: number;
  effectiveFrom: string;
}

/**
 * The calendar day immediately before the given date, in UTC - never local
 * setters, so a @db.Date column's day boundary is never shifted by the
 * server's own timezone (same discipline as attendance/tenant-day.util.ts's
 * parseTimeOfDay). setUTCDate correctly rolls a day-0 value into the last
 * day of the previous month, including across year boundaries.
 */
function dayBefore(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

@Injectable()
export class PlanPriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Historizes exactly like Enrollment, per domain-model.md: closes the
   * current open-ended price (effectiveTo = newEffectiveFrom - 1 day) and
   * opens a new one, in one transaction. No-op close step if this is the
   * plan's first-ever price.
   */
  setPrice(tenantId: string, planId: string, data: SetPriceData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Plan', planId, () => tx.plan.findFirst({ where: { id: planId, tenantId, deletedAt: null } }));

      // Normalize to a calendar date (UTC midnight) before any comparison or
      // arithmetic uses it - effectiveFrom may arrive as a full ISO datetime
      // (@IsDateString() accepts either), and a same-calendar-day value with
      // a nonzero time-of-day must not be treated as "after" the current
      // period's own (always midnight-normalized, @db.Date) effectiveFrom.
      const newEffectiveFrom = new Date(data.effectiveFrom.slice(0, 10));

      const currentOpen = await tx.planPrice.findFirst({
        where: { tenantId, planId, effectiveTo: null, deletedAt: null },
      });

      if (currentOpen) {
        if (newEffectiveFrom <= currentOpen.effectiveFrom) {
          throw new PlanPriceConflictError(
            "effectiveFrom must be after the current price period's own effectiveFrom",
          );
        }
        await tx.planPrice.update({
          where: { id: currentOpen.id },
          data: { effectiveTo: dayBefore(newEffectiveFrom), updatedBy: createdBy },
        });
      }

      return tx.planPrice.create({
        data: {
          tenantId,
          planId,
          amount: data.amount,
          effectiveFrom: newEffectiveFrom,
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, planId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Plan', planId, () => tx.plan.findFirst({ where: { id: planId, tenantId, deletedAt: null } }));

      const where: Prisma.PlanPriceWhereInput = { tenantId, planId, deletedAt: null };

      const [items, total] = await Promise.all([
        tx.planPrice.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.planPrice.count({ where }),
      ]);

      return { items, total };
    });
  }

  /** Resolves the price effective on asOfDate - inclusive both ends, matching setPrice's closing convention so every date maps to exactly one row. */
  findEffective(tenantId: string, planId: string, asOfDate: string, tx?: Prisma.TransactionClient) {
    const run = (client: Prisma.TransactionClient) => this.resolveEffective(client, tenantId, planId, asOfDate);
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }

  private resolveEffective(tx: Prisma.TransactionClient, tenantId: string, planId: string, asOfDate: string) {
    const asOfDateValue = new Date(asOfDate);
    return findOrThrow('PlanPrice', planId, () =>
      tx.planPrice.findFirst({
        where: {
          tenantId,
          planId,
          effectiveFrom: { lte: asOfDateValue },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOfDateValue } }],
        },
      }),
    );
  }
}
