import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { PaymentSortField } from './dto/payment-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: PaymentSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  amount: number;
  paymentMethod: string;
  paidAt?: string;
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return withTenantContext(this.prisma, tenantId, fn);
  }

  /**
   * Composable - never opens its own transaction, called within
   * PaymentService.record's own transaction. invoiceId is always null -
   * amount-per-invoice tracking is exclusively PaymentAllocation's job now
   * (§2.1: Payment is no longer 1:1 with Invoice).
   */
  async createComposable(tx: Prisma.TransactionClient, tenantId: string, guardianId: string, data: CreateData, actorId: string) {
    await findOrThrow('Guardian', guardianId, () =>
      tx.guardian.findFirst({ where: { id: guardianId, tenantId, deletedAt: null } }),
    );

    return tx.payment.create({
      data: {
        tenantId,
        invoiceId: null,
        guardianId,
        amount: new Prisma.Decimal(data.amount),
        paymentMethod: data.paymentMethod,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        createdBy: actorId,
      },
    });
  }

  findForGuardian(tenantId: string, guardianId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Guardian', guardianId, () =>
        tx.guardian.findFirst({ where: { id: guardianId, tenantId, deletedAt: null } }),
      );

      const where: Prisma.PaymentWhereInput = { tenantId, guardianId, deletedAt: null };
      const [items, total] = await Promise.all([
        tx.payment.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.payment.count({ where }),
      ]);

      return { items, total };
    });
  }
}
