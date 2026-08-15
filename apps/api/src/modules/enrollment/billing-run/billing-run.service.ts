import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { Logger } from 'nestjs-pino';
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
import { BillingTermsUnresolvedError } from '../pricing-engine/billing-terms-unresolved.error';
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
    private readonly logger: Logger,
  ) {}

  generateForPeriod(dto: CreateBillingRunDto) {
    const tenantId = this.currentTenant.getTenantId();
    const triggeredBy = this.currentUser.getUserId();
    return this.run(tenantId, dto.periodStart, dto.periodEnd, triggeredBy).catch((error) => this.translateConflict(error));
  }

  private async run(tenantId: string, periodStart: string, periodEnd: string, triggeredBy: string) {
    const billingRun = await this.repository.upsertForPeriod(tenantId, periodStart, periodEnd, triggeredBy);

    // Approved interpretation: "eligible children" reuses
    // countEligibleSiblings' own ACTIVE/SUSPENDED-overlap definition, tenant-wide.
    const eligibleChildren = await this.billingTerms.findChildrenWithEffectiveTermsForPeriod(
      tenantId,
      periodStart,
      periodEnd,
    );

    // EXPLICIT: "already fully ISSUED... nothing left to regenerate" - never
    // thrown for the ordinary idempotent-rerun case (no invoices yet, at
    // least one still DRAFT, or an eligible child who has no invoice in this
    // run yet). Checking only existingInvoices here would wrongly block a
    // child who becomes eligible for this period *after* every
    // already-attached invoice was issued - fixed live during the MVP trial
    // (Round D): existingInvoices.every(...) alone can never distinguish
    // "nothing left to regenerate" from "nothing has been generated yet for
    // this specific child," so it's now compared against eligibleChildren.
    const existingInvoices = await this.invoice.findAllForBillingRun(tenantId, billingRun.id);
    const invoicedChildIds = new Set(existingInvoices.map((i) => i.childId));
    const hasUninvoicedEligibleChild = eligibleChildren.some((c) => !invoicedChildIds.has(c.childId));
    if (
      existingInvoices.length > 0 &&
      existingInvoices.every((i) => i.status !== OPEN_INVOICE_STATUS) &&
      !hasUninvoicedEligibleChild
    ) {
      throw new BillingRunConflictError('This billing run has already been fully issued - nothing left to regenerate');
    }

    let anyFailed = false;
    for (const { childId } of eligibleChildren) {
      try {
        // EXPLICIT: each child's regeneration is its own separate
        // transaction - a failure on one child never rolls back another's
        // already-generated invoice. computeChargesForPeriod throws before
        // any invoice write happens for either Gap #1 case, so a failed
        // child never receives a wrong or partial invoice.
        await this.repository.runInTransaction(tenantId, (tx) =>
          this.regenerateInvoiceForChild(tx, tenantId, childId, periodStart, periodEnd, triggeredBy),
        );
      } catch (error) {
        // Failure detail is not persisted beyond the aggregate status -
        // confirmed via ADR-0017's explicit rejection of a BillingRunEvent
        // audit entity; not reopened here (MVP Freeze Review, Milestone 1).
        // The two cases are still distinguished at the log level only: an
        // unresolved-billing-terms child is an expected, anticipated
        // billing exception (warn), anything else is a genuine, unexpected
        // fault (error) - both still mark the run PARTIAL_FAILURE and both
        // let the loop continue to the next child.
        if (error instanceof BillingTermsUnresolvedError) {
          this.logger.warn(
            { tenantId, childId, periodStart, periodEnd, err: error },
            'BillingRunService: child skipped - billing terms unresolved',
          );
        } else {
          this.logger.error(
            { tenantId, childId, periodStart, periodEnd, err: error },
            'BillingRunService: unexpected error regenerating invoice for child',
          );
        }
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
