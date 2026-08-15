import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { BillingRunSortField } from './dto/billing-run-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: BillingRunSortField;
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class BillingRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find-or-create against UNIQUE(tenantId, periodStart, periodEnd), not
   * check-then-insert - the TOCTOU-safe pattern this constraint exists for.
   * runAt refreshes on every call, including re-runs (approved
   * interpretation) - status is only ever set here as the initial
   * optimistic COMPLETED; the per-child loop in BillingRunService may
   * downgrade it to PARTIAL_FAILURE afterward via updateStatus.
   */
  upsertForPeriod(tenantId: string, periodStart: string, periodEnd: string, actorId: string) {
    return withTenantContext(this.prisma, tenantId, (tx) => {
      const periodStartDate = new Date(periodStart.slice(0, 10));
      const periodEndDate = new Date(periodEnd.slice(0, 10));
      const now = new Date();
      return tx.billingRun.upsert({
        where: { tenantId_periodStart_periodEnd: { tenantId, periodStart: periodStartDate, periodEnd: periodEndDate } },
        create: {
          tenantId,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          status: 'COMPLETED',
          runAt: now,
          createdBy: actorId,
        },
        update: { runAt: now, updatedBy: actorId },
      });
    });
  }

  /** Composable (optional tx) - regenerateInvoiceForChild's own lookup of the already-created-or-found BillingRun row for this period. */
  findByPeriod(tenantId: string, periodStart: string, periodEnd: string, tx?: Prisma.TransactionClient) {
    const run = (client: Prisma.TransactionClient) => {
      const periodStartDate = new Date(periodStart.slice(0, 10));
      const periodEndDate = new Date(periodEnd.slice(0, 10));
      return client.billingRun.findFirst({
        where: { tenantId, periodStart: periodStartDate, periodEnd: periodEndDate, deletedAt: null },
      });
    };
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }

  updateStatus(tenantId: string, id: string, status: string, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('BillingRun', id, () => tx.billingRun.findFirst({ where: { id, tenantId, deletedAt: null } }));
      return tx.billingRun.update({ where: { id }, data: { status, updatedBy: actorId } });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.BillingRunWhereInput = { tenantId, deletedAt: null };
      const [items, total] = await Promise.all([
        tx.billingRun.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.billingRun.count({ where }),
      ]);
      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('BillingRun', id, () => tx.billingRun.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  /** Opens the per-child transaction BillingRunService.generateForPeriod's loop composes regenerateInvoiceForChild inside - withTenantContext stays repository-owned, matching every other module's convention, rather than a service calling it directly. */
  runInTransaction<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return withTenantContext(this.prisma, tenantId, fn);
  }
}
