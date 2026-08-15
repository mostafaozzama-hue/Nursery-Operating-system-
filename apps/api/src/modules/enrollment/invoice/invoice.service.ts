import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { LineItemDraft } from '../pricing-engine/line-item-draft.type';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { LineItemQueryDto } from './dto/line-item-query.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { InvoiceConflictError } from './invoice-conflict.error';
import { InvoiceRepository } from './invoice.repository';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreateInvoiceDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId).catch((error) => this.translateError(error));
  }

  async findAll(query: InvoiceQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  /** Composable (optional tx) - WaiverService.applyRetroactively's entry read (status + billingRun/period in one query). */
  findOneComposable(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    return this.repository.findOneComposable(tenantId, id, tx).catch(translateNotFound);
  }

  update(id: string, dto: UpdateInvoiceDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch((error) => this.translateError(error));
  }

  addLineItem(invoiceId: string, dto: CreateLineItemDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .addLineItem(tenantId, invoiceId, dto, userId)
      .catch((error) => this.translateError(error));
  }

  updateLineItem(invoiceId: string, lineItemId: string, dto: UpdateLineItemDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .updateLineItem(tenantId, invoiceId, lineItemId, dto, userId)
      .catch((error) => this.translateError(error));
  }

  removeLineItem(invoiceId: string, lineItemId: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .removeLineItem(tenantId, invoiceId, lineItemId, userId)
      .catch((error) => this.translateError(error));
  }

  issue(invoiceId: string, dto: IssueInvoiceDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.issue(tenantId, invoiceId, dto, userId).catch((error) => this.translateError(error));
  }

  void(invoiceId: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.void(tenantId, invoiceId, userId).catch((error) => this.translateError(error));
  }

  async findLineItems(invoiceId: string, query: LineItemQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository
      .findLineItems(tenantId, invoiceId, query)
      .catch((error) => this.translateError(error));
    return buildPaginatedResult(items, total, query);
  }

  /** Composable, never opens its own transaction - called only by BillingRunService.regenerateInvoiceForChild. Explicit tenantId, matching every other composable method's convention. */
  replaceGeneratedLines(tx: Prisma.TransactionClient, tenantId: string, invoiceId: string, drafts: LineItemDraft[], actorId: string) {
    return this.repository
      .replaceGeneratedLines(tx, tenantId, invoiceId, drafts, actorId)
      .catch((error) => this.translateError(error));
  }

  /** Composable, never opens its own transaction - called only by BillingRunService.regenerateInvoiceForChild, the first time a child gets an invoice for a given billing run. */
  createComposable(
    tx: Prisma.TransactionClient,
    tenantId: string,
    data: { childId: string; billedToGuardianId: string; billingRunId: string },
    actorId: string,
  ) {
    return this.repository.createComposable(tx, tenantId, data, actorId);
  }

  /** Composable (optional tx) - BillingRunService.regenerateInvoiceForChild's idempotency lookup. */
  findByBillingRunAndChild(tenantId: string, billingRunId: string, childId: string, tx?: Prisma.TransactionClient) {
    return this.repository.findByBillingRunAndChild(tenantId, billingRunId, childId, tx);
  }

  /** Composable (optional tx) - BillingRunService.generateForPeriod's "already fully ISSUED" check. */
  findAllForBillingRun(tenantId: string, billingRunId: string, tx?: Prisma.TransactionClient) {
    return this.repository.findAllForBillingRun(tenantId, billingRunId, tx);
  }

  /** Composable, never opens its own transaction - called only by OneTimeChargeService.add. Returns the current invoice alongside the new line item so the caller can decide whether a ManualOverride is needed without a second read. */
  addExceptionLineItem(
    tx: Prisma.TransactionClient,
    tenantId: string,
    invoiceId: string,
    data: { description: string; quantity: number; unitAmount: number; chargeCategory: string },
    actorId: string,
  ) {
    return this.repository
      .addExceptionLineItem(tx, tenantId, invoiceId, data, actorId)
      .catch((error) => this.translateError(error));
  }

  async findPayments(invoiceId: string, query: PaymentQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository
      .findPayments(tenantId, invoiceId, query)
      .catch((error) => this.translateError(error));
    const mapped = items.map((allocation) => ({
      id: allocation.id,
      paymentId: allocation.paymentId,
      amountApplied: allocation.amountApplied,
      paymentMethod: allocation.payment.paymentMethod,
      paidAt: allocation.payment.paidAt,
      createdAt: allocation.payment.createdAt,
    }));
    return buildPaginatedResult(mapped, total, query);
  }

  /** Composable, never opens its own transaction - called only by PaymentAllocationService.allocate, once per invoice it just wrote a PaymentAllocation row against. */
  recomputePaymentState(tx: Prisma.TransactionClient, tenantId: string, invoiceId: string, actorId: string) {
    return this.repository.recomputePaymentState(tx, tenantId, invoiceId, actorId);
  }

  private translateError(error: unknown): never {
    if (error instanceof InvoiceConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
