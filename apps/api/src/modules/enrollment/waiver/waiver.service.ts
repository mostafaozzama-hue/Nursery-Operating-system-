import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { BillingRunService } from '../billing-run/billing-run.service';
import { CreditNoteService } from '../credit-note/credit-note.service';
import { MANUAL_OVERRIDE_REASON_CODES } from '../enrollment-billing-terms/dto/manual-override-reason-code';
import { InvoiceService } from '../invoice/invoice.service';
import { ManualOverrideService } from '../manual-override/manual-override.service';
import { PricingEngineService } from '../pricing-engine/pricing-engine.service';
import { CreateWaiverDto } from './dto/create-waiver.dto';
import { UpdateWaiverDto } from './dto/update-waiver.dto';
import { WaiverQueryDto } from './dto/waiver-query.dto';
import { WaiverConflictError } from './waiver-conflict.error';
import { WaiverRepository } from './waiver.repository';

const DRAFT_STATUS = 'DRAFT';
const VOID_STATUS = 'VOID';

@Injectable()
export class WaiverService {
  constructor(
    private readonly repository: WaiverRepository,
    private readonly invoiceService: InvoiceService,
    private readonly billingRunService: BillingRunService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly creditNoteService: CreditNoteService,
    private readonly manualOverrideService: ManualOverrideService,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(childId: string, dto: CreateWaiverDto) {
    const tenantId = this.currentTenant.getTenantId();
    const approvedBy = this.currentUser.getUserId();
    return this.repository.create(tenantId, childId, dto, approvedBy).catch((error) => this.translateConflict(error));
  }

  update(id: string, dto: UpdateWaiverDto) {
    const tenantId = this.currentTenant.getTenantId();
    const updatedBy = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, updatedBy).catch((error) => this.translateConflict(error));
  }

  /** Waiver bug fix (Easy Enrollment, Product Gap H phase 2) - see WaiverRepository.softDelete's doc comment. */
  remove(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    const deletedBy = this.currentUser.getUserId();
    return this.repository.softDelete(tenantId, id, deletedBy).catch((error) => this.translateConflict(error));
  }

  async findForChild(childId: string, query: WaiverQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findForChild(tenantId, childId, query).catch(translateNotFound);
    return buildPaginatedResult(items, total, query);
  }

  /** Composable (optional tx) - primarily called by PricingEngineService, later. Explicit tenantId, matching ChildFeeAssignmentService/ChildDiscountAssignmentService's identical convention. Untranslated - caller's responsibility. */
  findEffectiveForPeriod(tenantId: string, childId: string, periodStart: string, periodEnd: string, tx?: Prisma.TransactionClient) {
    return this.repository.findEffectiveForPeriod(tenantId, childId, periodStart, periodEnd, tx);
  }

  /**
   * Branches on the target invoice's status. DRAFT: regenerate in place
   * via BillingRunService.regenerateInvoiceForChild, the same shared
   * primitive BillingRunService.generateForPeriod uses - then record a
   * ManualOverride (EXPLICIT, per domain-model.md's own description of
   * how ManualOverride/CreditNote relate: "a retroactive waiver on a
   * DRAFT invoice needs only a ManualOverride"). Anything issued
   * (ISSUED/PARTIALLY_PAID/PAID): recompute via PricingEngineService as
   * the single source of truth (your explicit instruction - no parallel
   * pricing logic here), credit the difference via CreditNoteService,
   * then record a ManualOverride. VOID, a manually-created invoice with
   * no BillingRun to resolve a period from, a creditAmount that isn't
   * actually positive, and a Waiver.reasonCode with no ManualOverride
   * equivalent (OWNER_FAMILY) are all left as explicit, undecided
   * business-rule gaps - plain inline throws, no invented behavior, per
   * explicit instruction.
   */
  applyRetroactively(waiverId: string, targetInvoiceId: string) {
    const tenantId = this.currentTenant.getTenantId();
    const actorId = this.currentUser.getUserId();
    return this.repository.runInTransaction(tenantId, (tx) =>
      this.applyRetroactivelyWithinTransaction(tx, tenantId, waiverId, targetInvoiceId, actorId),
    );
  }

  private async applyRetroactivelyWithinTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    waiverId: string,
    targetInvoiceId: string,
    actorId: string,
  ): Promise<void> {
    const waiver = await this.repository.findOneComposable(tenantId, waiverId, tx);
    const invoice = await this.invoiceService.findOneComposable(tenantId, targetInvoiceId, tx);

    if (!invoice.billingRun) {
      // Unresolved business-rule gap: a manually-created invoice (never
      // touched by BillingRunService) has no billing period to recompute
      // against. Not decided here.
      throw new Error(
        `WaiverService.applyRetroactively: invoice ${targetInvoiceId} has no associated BillingRun - no billing period to recompute against`,
      );
    }

    // Direct reuse where the two reasonCode vocabularies already share
    // the same literal value (SCHOLARSHIP/HARDSHIP/STAFF_BENEFIT/OTHER) -
    // not an invented mapping. OWNER_FAMILY has no ManualOverride
    // equivalent and is left as an unresolved business-rule gap.
    if (!(MANUAL_OVERRIDE_REASON_CODES as readonly string[]).includes(waiver.reasonCode)) {
      throw new Error(
        `WaiverService.applyRetroactively: Waiver.reasonCode "${waiver.reasonCode}" has no corresponding ManualOverride reasonCode`,
      );
    }
    const overrideReasonCode = waiver.reasonCode;
    const reasonNote = waiver.reasonNote ?? undefined;

    const periodStart = invoice.billingRun.periodStart.toISOString().slice(0, 10);
    const periodEnd = invoice.billingRun.periodEnd.toISOString().slice(0, 10);

    if (invoice.status === DRAFT_STATUS) {
      const previousTotal = invoice.totalAmount;
      const regenerated = await this.billingRunService.regenerateInvoiceForChild(
        tx,
        tenantId,
        invoice.childId,
        periodStart,
        periodEnd,
        actorId,
      );
      await this.manualOverrideService.record(
        tx,
        tenantId,
        {
          overrideType: 'WAIVER',
          reasonCode: overrideReasonCode,
          reasonNote,
          relatedEntityType: 'Invoice',
          relatedEntityId: targetInvoiceId,
          previousValue: JSON.stringify({ totalAmount: previousTotal.toString() }),
          newValue: JSON.stringify({ totalAmount: regenerated.totalAmount.toString() }),
        },
        actorId,
      );
      return;
    }

    if (invoice.status === VOID_STATUS) {
      // Unresolved business-rule gap: neither document addresses
      // retroactively applying a waiver to a voided invoice. Not decided
      // here.
      throw new Error(`WaiverService.applyRetroactively: invoice ${targetInvoiceId} is VOID`);
    }

    // "Anything issued" (ISSUED/PARTIALLY_PAID/PAID).
    const { drafts } = await this.pricingEngineService.computeChargesForPeriod(
      tenantId,
      invoice.childId,
      periodStart,
      periodEnd,
      tx,
    );
    const newTotal = drafts.reduce((sum, draft) => sum.plus(draft.totalAmount), new Prisma.Decimal(0));
    const creditAmount = invoice.totalAmount.minus(newTotal);

    if (creditAmount.lessThanOrEqualTo(0)) {
      // Unresolved business-rule gap: neither document defines what
      // should happen when the recomputed total isn't actually lower
      // than what's already on the invoice. Not decided here.
      throw new Error(
        `WaiverService.applyRetroactively: recomputed total for invoice ${targetInvoiceId} is not lower than its current total`,
      );
    }

    const creditNote = await this.creditNoteService.createComposable(
      tx,
      tenantId,
      {
        invoiceId: targetInvoiceId,
        guardianId: invoice.billedToGuardianId,
        amount: creditAmount,
        reasonCode: 'RETROACTIVE_WAIVER',
      },
      actorId,
    );
    await this.manualOverrideService.record(
      tx,
      tenantId,
      {
        overrideType: 'WAIVER',
        reasonCode: overrideReasonCode,
        reasonNote,
        relatedEntityType: 'CreditNote',
        relatedEntityId: creditNote.id,
        previousValue: JSON.stringify({ invoiceTotalAmount: invoice.totalAmount.toString() }),
        newValue: JSON.stringify({ creditNoteAmount: creditAmount.toString(), creditNoteId: creditNote.id }),
      },
      actorId,
    );
  }

  private translateConflict(error: unknown): never {
    if (error instanceof WaiverConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
