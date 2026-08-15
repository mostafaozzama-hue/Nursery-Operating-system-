import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { InvoiceService } from '../invoice/invoice.service';
import { PaymentAllocationError } from './payment-allocation.error';
import { PaymentAllocationRepository } from './payment-allocation.repository';

@Injectable()
export class PaymentAllocationService {
  constructor(
    private readonly repository: PaymentAllocationRepository,
    private readonly invoiceService: InvoiceService,
    private readonly currentTenant: CurrentTenantProvider,
  ) {}

  /**
   * Composable - never opens its own transaction, always runs inside
   * PaymentService.record's transaction. Oldest-invoice-first across ALL of
   * the guardian's children (never per-child) - a single Payment fully
   * allocates to the oldest outstanding invoice before spilling into the
   * next. Decides the split and creates PaymentAllocation rows only - never
   * writes to Invoice itself; InvoiceService.recomputePaymentState (called
   * once per invoice touched) remains the sole owner of that transition.
   * Any remainder left unallocated once outstanding invoices are exhausted
   * becomes guardian-level credit, by design - not an error.
   */
  async allocate(
    tx: Prisma.TransactionClient,
    tenantId: string,
    paymentId: string,
    guardianId: string,
    amount: string,
    actorId: string,
  ) {
    const candidates = await this.repository.findOutstandingForGuardian(tx, tenantId, guardianId);

    let remaining = new Prisma.Decimal(amount);
    const allocations = [];

    for (const candidate of candidates) {
      if (remaining.lessThanOrEqualTo(0)) {
        break;
      }

      const alreadyApplied = await this.repository.sumAppliedForInvoice(tx, tenantId, candidate.id);
      const outstandingBalance = candidate.totalAmount.minus(alreadyApplied);
      if (outstandingBalance.lessThanOrEqualTo(0)) {
        continue;
      }

      const amountApplied = Prisma.Decimal.min(remaining, outstandingBalance);
      const allocation = await this.repository.create(
        tx,
        tenantId,
        { paymentId, invoiceId: candidate.id, amountApplied },
        actorId,
      );
      await this.invoiceService.recomputePaymentState(tx, tenantId, candidate.id, actorId);

      allocations.push(allocation);
      remaining = remaining.minus(amountApplied);
    }

    // Defensive boundary only - should be structurally unreachable given the
    // clamp above (§8).
    const totalAllocated = allocations.reduce((sum, a) => sum.plus(a.amountApplied), new Prisma.Decimal(0));
    if (totalAllocated.greaterThan(amount)) {
      throw new PaymentAllocationError("Allocated amount exceeds the payment's recorded amount");
    }

    return allocations;
  }

  getAvailableCredit(guardianId: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.getAvailableCredit(tenantId, guardianId);
  }
}
