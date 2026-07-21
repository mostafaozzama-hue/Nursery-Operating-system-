import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { getTenantLocalDate } from '../../../common/date/tenant-local-date';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { InvoiceConflictError } from './invoice-conflict.error';
import { InvoiceSortField, InvoiceStatus } from './dto/invoice-query.dto';
import { PaymentSortField } from './dto/payment-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  childId?: string;
  guardianId?: string;
  status?: InvoiceStatus;
  sortBy: InvoiceSortField;
  sortOrder: 'asc' | 'desc';
}

interface FindPaymentsOptions {
  page: number;
  pageSize: number;
  sortBy: PaymentSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateLineItemData {
  description: string;
  quantity: number;
  unitAmount: number;
}

interface CreateInvoiceData {
  childId: string;
  billedToGuardianId: string;
  dueDate?: string;
  lineItems?: CreateLineItemData[];
}

interface UpdateInvoiceData {
  childId?: string;
  billedToGuardianId?: string;
  dueDate?: string;
}

interface UpdateLineItemData {
  description?: string;
  quantity?: number;
  unitAmount?: number;
}

interface IssueData {
  dueDate?: string;
}

interface RecordPaymentData {
  amount: number;
  paymentMethod: string;
  paidAt?: string;
}

const PAYABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID'];

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateInvoiceData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', data.childId, () =>
        tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
      );
      await findOrThrow('Guardian', data.billedToGuardianId, () =>
        tx.guardian.findFirst({ where: { id: data.billedToGuardianId, tenantId, deletedAt: null } }),
      );

      const lineItems = (data.lineItems ?? []).map((li) => {
        const quantity = new Prisma.Decimal(li.quantity);
        const unitAmount = new Prisma.Decimal(li.unitAmount);
        return {
          tenantId,
          description: li.description,
          quantity,
          unitAmount,
          totalAmount: quantity.times(unitAmount),
          createdBy,
        };
      });
      const totalAmount = lineItems.reduce((sum, li) => sum.plus(li.totalAmount), new Prisma.Decimal(0));

      return tx.invoice.create({
        data: {
          tenantId,
          childId: data.childId,
          billedToGuardianId: data.billedToGuardianId,
          status: 'DRAFT',
          totalAmount,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          createdBy,
          lineItems: { create: lineItems },
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const tenant = await findOrThrow('Tenant', tenantId, () =>
        tx.tenant.findFirst({ where: { id: tenantId, deletedAt: null } }),
      );
      const today = getTenantLocalDate(tenant.timezone);

      const baseWhere: Prisma.InvoiceWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.childId ? { childId: options.childId } : {}),
        ...(options.guardianId ? { billedToGuardianId: options.guardianId } : {}),
      };

      const where: Prisma.InvoiceWhereInput =
        options.status === 'OVERDUE'
          ? { ...baseWhere, status: { in: PAYABLE_STATUSES }, dueDate: { lt: today } }
          : options.status
            ? { ...baseWhere, status: options.status }
            : baseWhere;

      const [items, total] = await Promise.all([
        tx.invoice.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.invoice.count({ where }),
      ]);

      return { items: items.map((invoice) => this.withEffectiveStatus(invoice, tenant.timezone)), total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const tenant = await findOrThrow('Tenant', tenantId, () =>
        tx.tenant.findFirst({ where: { id: tenantId, deletedAt: null } }),
      );
      const invoice = await findOrThrow('Invoice', id, () =>
        tx.invoice.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );
      return this.withEffectiveStatus(invoice, tenant.timezone);
    });
  }

  update(tenantId: string, id: string, data: UpdateInvoiceData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, id);

      if (invoice.status !== 'DRAFT') {
        throw new InvoiceConflictError('Only a draft invoice can be edited');
      }

      if (data.childId) {
        await findOrThrow('Child', data.childId, () =>
          tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
        );
      }
      if (data.billedToGuardianId) {
        await findOrThrow('Guardian', data.billedToGuardianId, () =>
          tx.guardian.findFirst({ where: { id: data.billedToGuardianId, tenantId, deletedAt: null } }),
        );
      }

      return tx.invoice.update({
        where: { id },
        data: {
          childId: data.childId,
          billedToGuardianId: data.billedToGuardianId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          updatedBy,
        },
      });
    });
  }

  addLineItem(tenantId: string, invoiceId: string, data: CreateLineItemData, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, invoiceId);
      if (invoice.status !== 'DRAFT') {
        throw new InvoiceConflictError('Line items can only be added while the invoice is a draft');
      }

      const quantity = new Prisma.Decimal(data.quantity);
      const unitAmount = new Prisma.Decimal(data.unitAmount);

      const lineItem = await tx.invoiceLineItem.create({
        data: {
          tenantId,
          invoiceId,
          description: data.description,
          quantity,
          unitAmount,
          totalAmount: quantity.times(unitAmount),
          createdBy: actorId,
        },
      });

      await this.recomputeTotal(tx, tenantId, invoiceId, actorId);
      return lineItem;
    });
  }

  updateLineItem(
    tenantId: string,
    invoiceId: string,
    lineItemId: string,
    data: UpdateLineItemData,
    actorId: string,
  ) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, invoiceId);
      if (invoice.status !== 'DRAFT') {
        throw new InvoiceConflictError('Line items can only be edited while the invoice is a draft');
      }

      const current = await findOrThrow('InvoiceLineItem', lineItemId, () =>
        tx.invoiceLineItem.findFirst({ where: { id: lineItemId, invoiceId, tenantId, deletedAt: null } }),
      );

      const quantity = data.quantity !== undefined ? new Prisma.Decimal(data.quantity) : current.quantity;
      const unitAmount = data.unitAmount !== undefined ? new Prisma.Decimal(data.unitAmount) : current.unitAmount;

      const lineItem = await tx.invoiceLineItem.update({
        where: { id: lineItemId },
        data: {
          description: data.description,
          quantity,
          unitAmount,
          totalAmount: quantity.times(unitAmount),
          updatedBy: actorId,
        },
      });

      await this.recomputeTotal(tx, tenantId, invoiceId, actorId);
      return lineItem;
    });
  }

  removeLineItem(tenantId: string, invoiceId: string, lineItemId: string, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, invoiceId);
      if (invoice.status !== 'DRAFT') {
        throw new InvoiceConflictError('Line items can only be removed while the invoice is a draft');
      }

      await findOrThrow('InvoiceLineItem', lineItemId, () =>
        tx.invoiceLineItem.findFirst({ where: { id: lineItemId, invoiceId, tenantId, deletedAt: null } }),
      );

      await tx.invoiceLineItem.update({
        where: { id: lineItemId },
        data: { deletedAt: new Date(), deletedBy: actorId },
      });

      await this.recomputeTotal(tx, tenantId, invoiceId, actorId);
    });
  }

  issue(tenantId: string, invoiceId: string, data: IssueData, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, invoiceId);
      if (invoice.status !== 'DRAFT') {
        throw new InvoiceConflictError('Only a draft invoice can be issued');
      }

      const lineItemCount = await tx.invoiceLineItem.count({
        where: { invoiceId, tenantId, deletedAt: null },
      });
      if (lineItemCount === 0) {
        throw new InvoiceConflictError('Cannot issue an invoice with no line items');
      }

      const dueDate = data.dueDate ? new Date(data.dueDate) : invoice.dueDate;
      if (!dueDate) {
        throw new InvoiceConflictError('A due date is required to issue an invoice');
      }

      // Zero-amount invoices (scholarships, waived fees) are immediately
      // settled - there's nothing to pay, so they never occupy ISSUED.
      const status = invoice.totalAmount.equals(0) ? 'PAID' : 'ISSUED';

      return tx.invoice.update({
        where: { id: invoiceId },
        data: { status, dueDate, updatedBy: actorId },
      });
    });
  }

  recordPayment(tenantId: string, invoiceId: string, data: RecordPaymentData, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, invoiceId);
      if (!PAYABLE_STATUSES.includes(invoice.status)) {
        throw new InvoiceConflictError('Payments can only be recorded against an issued invoice');
      }

      const amount = new Prisma.Decimal(data.amount);

      const paidSoFarAgg = await tx.payment.aggregate({
        where: { invoiceId, tenantId, deletedAt: null },
        _sum: { amount: true },
      });
      const paidSoFar = paidSoFarAgg._sum.amount ?? new Prisma.Decimal(0);
      const newTotal = paidSoFar.plus(amount);

      if (newTotal.greaterThan(invoice.totalAmount)) {
        throw new InvoiceConflictError('This payment would exceed the outstanding balance');
      }

      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId,
          amount,
          paymentMethod: data.paymentMethod,
          paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
          createdBy: actorId,
        },
      });

      const status = newTotal.equals(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
      await tx.invoice.update({ where: { id: invoiceId }, data: { status, updatedBy: actorId } });

      return payment;
    });
  }

  void(tenantId: string, invoiceId: string, actorId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const invoice = await this.lockInvoice(tx, tenantId, invoiceId);
      if (invoice.status === 'VOID') {
        throw new InvoiceConflictError('This invoice is already void');
      }

      return tx.invoice.update({ where: { id: invoiceId }, data: { status: 'VOID', updatedBy: actorId } });
    });
  }

  findPayments(tenantId: string, invoiceId: string, options: FindPaymentsOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Invoice', invoiceId, () =>
        tx.invoice.findFirst({ where: { id: invoiceId, tenantId, deletedAt: null } }),
      );

      const where: Prisma.PaymentWhereInput = { tenantId, invoiceId, deletedAt: null };
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

  /** Recomputes Invoice.totalAmount from its live line items - the only place this field is ever written, never independently. */
  private async recomputeTotal(
    tx: Prisma.TransactionClient,
    tenantId: string,
    invoiceId: string,
    actorId: string,
  ): Promise<void> {
    const agg = await tx.invoiceLineItem.aggregate({
      where: { invoiceId, tenantId, deletedAt: null },
      _sum: { totalAmount: true },
    });
    const totalAmount = agg._sum.totalAmount ?? new Prisma.Decimal(0);
    await tx.invoice.update({ where: { id: invoiceId }, data: { totalAmount, updatedBy: actorId } });
  }

  /**
   * Locks the Invoice row for the remainder of the transaction before any
   * read/write of it, its line items, or its payments - mandatory for every
   * mutating operation in this module. Prisma has no high-level FOR UPDATE,
   * so the lock is acquired via a raw query; the actual, fully-typed row is
   * then re-read normally (safe: the lock guarantees no concurrent writer
   * can have changed it in between).
   */
  private async lockInvoice(tx: Prisma.TransactionClient, tenantId: string, invoiceId: string) {
    await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
    return findOrThrow('Invoice', invoiceId, () =>
      tx.invoice.findFirst({ where: { id: invoiceId, tenantId, deletedAt: null } }),
    );
  }

  private withEffectiveStatus<T extends { status: string; dueDate: Date | null }>(
    invoice: T,
    timezone: string,
  ): T {
    if (!PAYABLE_STATUSES.includes(invoice.status) || !invoice.dueDate) {
      return invoice;
    }
    const today = getTenantLocalDate(timezone);
    if (invoice.dueDate < today) {
      return { ...invoice, status: 'OVERDUE' };
    }
    return invoice;
  }
}
