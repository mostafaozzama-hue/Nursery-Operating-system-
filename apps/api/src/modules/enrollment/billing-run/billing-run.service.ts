import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
// EnrollmentBillingTermsRepository, not the request-scoped Service - only
// findChildrenWithEffectiveTermsForPeriod is used here (explicit tenantId,
// no CurrentTenantProvider/CurrentUserProvider needed) - see
// EnrollmentRepository's identical comment for the root cause.
import { EnrollmentBillingTermsRepository } from '../enrollment-billing-terms/enrollment-billing-terms.repository';
import { InvoiceService } from '../invoice/invoice.service';
import { PricingEngineService } from '../pricing-engine/pricing-engine.service';
import { BillingRunConflictError } from './billing-run-conflict.error';
import { BillingRunQueryDto } from './dto/billing-run-query.dto';
import { CreateBillingRunDto } from './dto/create-billing-run.dto';
import { BillingRunRepository } from './billing-run.repository';

const OPEN_INVOICE_STATUS = 'DRAFT';

@Injectable()
export class BillingRunService {
  constructor(
    private readonly repository: BillingRunRepository,
    private readonly billingTerms: EnrollmentBillingTermsRepository,
    private readonly pricingEngine: PricingEngineService,
    private readonly invoice: InvoiceService,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  generateForPeriod(dto: CreateBillingRunDto) {
    const tenantId = this.currentTenant.getTenantId();
    const triggeredBy = this.currentUser.getUserId();
    return this.run(tenantId, dto.periodStart, dto.periodEnd, triggeredBy).catch((error) => this.translateConflict(error));
  }

  private async run(tenantId: string, periodStart: string, periodEnd: string, triggeredBy: string) {
    const billingRun = await this.repository.upsertForPeriod(tenantId, periodStart, periodEnd, triggeredBy);

    // EXPLICIT: "already fully ISSUED... nothing left to regenerate" - never
    // thrown for the ordinary idempotent-rerun case (no invoices yet, or at
    // least one still DRAFT).
    const existingInvoices = await this.invoice.findAllForBillingRun(tenantId, billingRun.id);
    if (existingInvoices.length > 0 && existingInvoices.every((i) => i.status !== OPEN_INVOICE_STATUS)) {
      throw new BillingRunConflictError('This billing run has already been fully issued - nothing left to regenerate');
    }

    // Approved interpretation: "eligible children" reuses
    // countEligibleSiblings' own ACTIVE/SUSPENDED-overlap definition, tenant-wide.
    const eligibleChildren = await this.billingTerms.findChildrenWithEffectiveTermsForPeriod(
      tenantId,
      periodStart,
      periodEnd,
    );

    let anyFailed = false;
    for (const { childId } of eligibleChildren) {
      try {
        // EXPLICIT: each child's regeneration is its own separate
        // transaction - a failure on one child never rolls back another's
        // already-generated invoice.
        await this.repository.runInTransaction(tenantId, (tx) =>
          this.regenerateInvoiceForChild(tx, tenantId, childId, periodStart, periodEnd, triggeredBy),
        );
      } catch {
        // Failure detail is not persisted beyond the aggregate status -
        // confirmed via ADR-0017's explicit rejection of a BillingRunEvent
        // audit entity. Logged by the framework's own error handling, not a
        // stored, queryable record.
        anyFailed = true;
      }
    }

    return this.repository.updateStatus(tenantId, billingRun.id, anyFailed ? 'PARTIAL_FAILURE' : 'COMPLETED', triggeredBy);
  }

  /**
   * The single shared regeneration primitive: computes charges via
   * PricingEngineService, then calls InvoiceService.replaceGeneratedLines
   * (or creates the invoice first, on a child's first run under this
   * billing run). Never opens its own transaction - always composed inside
   * the caller's (this service's own per-child loop today; a future
   * WaiverService.applyRetroactively's DRAFT branch, later).
   */
  async regenerateInvoiceForChild(
    tx: Prisma.TransactionClient,
    tenantId: string,
    childId: string,
    periodStart: string,
    periodEnd: string,
    actorId: string,
  ) {
    // A genuine data-integrity expectation, not a business-rule gap - this
    // method is never called for a period whose BillingRun row wasn't
    // already created by the caller, so the existing findOrThrow/
    // EntityNotFoundError convention applies here, not a new error shape.
    const billingRun = await findOrThrow('BillingRun', `${periodStart}..${periodEnd}`, () =>
      this.repository.findByPeriod(tenantId, periodStart, periodEnd, tx),
    );

    const { billedToGuardianId, drafts } = await this.pricingEngine.computeChargesForPeriod(
      tenantId,
      childId,
      periodStart,
      periodEnd,
      tx,
    );

    const existing = await this.invoice.findByBillingRunAndChild(tenantId, billingRun.id, childId, tx);
    if (existing) {
      return this.invoice.replaceGeneratedLines(tx, tenantId, existing.id, drafts, actorId);
    }

    const created = await this.invoice.createComposable(
      tx,
      tenantId,
      { childId, billedToGuardianId, billingRunId: billingRun.id },
      actorId,
    );
    return this.invoice.replaceGeneratedLines(tx, tenantId, created.id, drafts, actorId);
  }

  async findHistory(query: BillingRunQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  private translateConflict(error: unknown): never {
    if (error instanceof BillingRunConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
