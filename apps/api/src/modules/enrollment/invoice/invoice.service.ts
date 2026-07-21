import { ConflictException, Injectable } from '@nestjs/common';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
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

  recordPayment(invoiceId: string, dto: RecordPaymentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .recordPayment(tenantId, invoiceId, dto, userId)
      .catch((error) => this.translateError(error));
  }

  void(invoiceId: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.void(tenantId, invoiceId, userId).catch((error) => this.translateError(error));
  }

  async findPayments(invoiceId: string, query: PaymentQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository
      .findPayments(tenantId, invoiceId, query)
      .catch((error) => this.translateError(error));
    return buildPaginatedResult(items, total, query);
  }

  private translateError(error: unknown): never {
    if (error instanceof InvoiceConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
