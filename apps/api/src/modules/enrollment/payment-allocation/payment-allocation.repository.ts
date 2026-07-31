import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { PAYABLE_STATUSES } from '../invoice/dto/invoice-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';

interface CreateData {
  paymentId: string;
  invoiceId: string;
  amountApplied: Prisma.Decimal;
}

@Injectable()
export class PaymentAllocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Composable - never opens its own transaction, always runs inside PaymentService.record's transaction. */
  create(tx: Prisma.TransactionClient, tenantId: string, data: CreateData, actorId: string) {
    return tx.paymentAllocation.create({
      data: {
        tenantId,
        paymentId: data.paymentId,
        invoiceId: data.invoiceId,
        amountApplied: data.amountApplied,
        createdBy: actorId,
      },
    });
  }

  /** Own table only - no cross-module read. Used to decide each invoice's remaining outstanding balance before clamping how much of the payment it can absorb. */
  async sumAppliedForInvoice(tx: Prisma.TransactionClient, tenantId: string, invoiceId: string): Promise<Prisma.Decimal> {
    const agg = await tx.paymentAllocation.aggregate({
      where: { invoiceId, tenantId, deletedAt: null },
      _sum: { amountApplied: true },
    });
    return agg._sum.amountApplied ?? new Prisma.Decimal(0);
  }

  /**
   * A direct, minimal read against the invoices table, deliberately NOT
   * exposed through InvoiceService - mirrors CapacityService's own
   * precedent (see capacity.service.ts): this query exists to serve one
   * specific workflow (payment allocation), not general invoice-lifecycle
   * concerns, so it belongs with the service that workflow lives in rather
   * than expanding InvoiceService's public interface with an
   * allocation-specific finder. Locks the whole candidate set FOR UPDATE up
   * front, oldest-first (dueDate ASC, createdAt ASC - the invoice that
   * becomes due first gets paid first; createdAt only breaks ties) - same
   * FOR UPDATE discipline InvoiceRepository.lockInvoice already uses for a
   * single row, extended to a list.
   */
  async findOutstandingForGuardian(tx: Prisma.TransactionClient, tenantId: string, guardianId: string) {
    await tx.$queryRaw`
      SELECT id FROM invoices
      WHERE billed_to_guardian_id = ${guardianId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status IN (${Prisma.join(PAYABLE_STATUSES)})
        AND deleted_at IS NULL
      ORDER BY due_date ASC, created_at ASC
      FOR UPDATE
    `;
    return tx.invoice.findMany({
      where: { tenantId, billedToGuardianId: guardianId, status: { in: PAYABLE_STATUSES }, deletedAt: null },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Entry point - its own transaction, read-only. Direct reads against both
   * payments and payment_allocations - the same cycle-avoidance precedent
   * applied a second time this round: PaymentModule already depends on
   * PaymentAllocationModule, so reading Payment through PaymentService here
   * would create the reverse edge and a real cycle.
   */
  getAvailableCredit(tenantId: string, guardianId: string): Promise<string> {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const paymentsAgg = await tx.payment.aggregate({
        where: { tenantId, guardianId, deletedAt: null },
        _sum: { amount: true },
      });
      const allocationsAgg = await tx.paymentAllocation.aggregate({
        where: { tenantId, deletedAt: null, payment: { guardianId, tenantId, deletedAt: null } },
        _sum: { amountApplied: true },
      });
      const totalRecorded = paymentsAgg._sum.amount ?? new Prisma.Decimal(0);
      const totalApplied = allocationsAgg._sum.amountApplied ?? new Prisma.Decimal(0);
      return totalRecorded.minus(totalApplied).toString();
    });
  }
}
