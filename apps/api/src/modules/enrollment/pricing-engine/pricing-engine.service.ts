import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { ChildDiscountAssignmentService } from '../child-discount-assignment/child-discount-assignment.service';
import { ChildFeeAssignmentService } from '../child-fee-assignment/child-fee-assignment.service';
import { EnrollmentBillingTermsService } from '../enrollment-billing-terms/enrollment-billing-terms.service';
import { PlanFeeService } from '../plan-fee/plan-fee.service';
import { PlanPriceService } from '../plan-price/plan-price.service';
import { SiblingDiscountTierService } from '../sibling-discount-tier/sibling-discount-tier.service';
import { WaiverService } from '../waiver/waiver.service';
import { ComputeChargesResult, LineItemDraft } from './line-item-draft.type';

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

@Injectable()
export class PricingEngineService {
  constructor(
    private readonly billingTerms: EnrollmentBillingTermsService,
    private readonly planPrice: PlanPriceService,
    private readonly planFee: PlanFeeService,
    private readonly childFeeAssignment: ChildFeeAssignmentService,
    private readonly childDiscountAssignment: ChildDiscountAssignmentService,
    private readonly siblingDiscountTier: SiblingDiscountTierService,
    private readonly waiver: WaiverService,
  ) {}

  async computeChargesForPeriod(
    tenantId: string,
    childId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ComputeChargesResult> {
    const terms = await this.billingTerms.findEffectiveForChildAndPeriod(tenantId, childId, periodStart, periodEnd, tx);
    if (!terms) {
      // Neither frozen document defines what a child with no effective
      // EnrollmentBillingTerms for this period should produce - a genuine
      // business-rule gap, not decided here. Stopping at the exact point
      // the missing rule is required, per explicit instruction.
      throw new Error(
        `PricingEngineService.computeChargesForPeriod: no effective EnrollmentBillingTerms for child ${childId} in period ${periodStart}..${periodEnd}`,
      );
    }

    const drafts: LineItemDraft[] = [];

    // ---- Tuition ----
    let tuitionAmount: Prisma.Decimal;
    let planPriceId: string | undefined;
    if (terms.customRateAmount !== null) {
      // EXPLICIT: customRateAmount, if set, overrides the plan's price
      // regardless of PlanPrice.
      tuitionAmount = terms.customRateAmount;
    } else if (terms.planId) {
      // EXPLICIT: no automatic proration - keeps billing whatever was in
      // effect at the period's start.
      const price = await this.planPrice.findEffective(tenantId, terms.planId, periodStart, tx);
      tuitionAmount = price.amount;
      planPriceId = price.id;
    } else {
      // Billing terms exist, but neither customRateAmount nor planId can
      // produce a tuition amount - same treatment as the missing-terms case
      // above: a genuine, undefined business-rule gap, not decided here.
      throw new Error(
        `PricingEngineService.computeChargesForPeriod: EnrollmentBillingTerms ${terms.id} has neither customRateAmount nor planId`,
      );
    }

    drafts.push(
      buildDraft('PLAN_TUITION', terms.plan?.name ?? 'Tuition', tuitionAmount, planPriceId),
    );

    // ---- Fees ----
    let feesSubtotal = ZERO;
    if (terms.planId) {
      const planFees = await this.planFee.findForPlanComposable(tenantId, terms.planId, tx);
      for (const planFee of planFees.filter((pf) => pf.isMandatory)) {
        feesSubtotal = feesSubtotal.plus(planFee.fee.amount);
        drafts.push(buildDraft('FEE', planFee.fee.name, planFee.fee.amount));
      }
    }
    const optionalFees = await this.childFeeAssignment.findEffectiveForPeriod(tenantId, childId, periodStart, periodEnd, tx);
    for (const assignment of optionalFees) {
      feesSubtotal = feesSubtotal.plus(assignment.snapshotAmount);
      drafts.push(buildDraft('FEE', assignment.fee.name, assignment.snapshotAmount));
    }

    // ---- Discounts (stackable + best exclusive) ----
    const assignments = await this.childDiscountAssignment.findEffectiveForPeriod(
      tenantId,
      childId,
      periodStart,
      periodEnd,
      tx,
    );
    let discountReductionTotal = ZERO;
    const stackable: { name: string; reduction: Prisma.Decimal }[] = [];
    const exclusive: { name: string; reduction: Prisma.Decimal }[] = [];
    for (const assignment of assignments) {
      // Your decision: BASE_TUITION_ONLY computes against tuition alone,
      // ALL_CHARGES against tuition plus all eligible fees.
      const base = assignment.discount.scope === 'ALL_CHARGES' ? tuitionAmount.plus(feesSubtotal) : tuitionAmount;
      const reduction =
        assignment.discount.type === 'PERCENTAGE'
          ? base.times(assignment.snapshotAmount).dividedBy(HUNDRED)
          : assignment.snapshotAmount;
      const entry = { name: assignment.discount.name, reduction };
      if (assignment.discount.stackable) {
        stackable.push(entry);
      } else {
        exclusive.push(entry);
      }
    }
    for (const s of stackable) {
      discountReductionTotal = discountReductionTotal.plus(s.reduction);
      drafts.push(buildDraft('DISCOUNT', s.name, s.reduction.negated()));
    }
    if (exclusive.length > 0) {
      // EXPLICIT: exclusive discounts don't stack with each other -
      // "best-for-the-family wins."
      const best = exclusive.reduce((a, b) => (b.reduction.greaterThan(a.reduction) ? b : a));
      discountReductionTotal = discountReductionTotal.plus(best.reduction);
      drafts.push(buildDraft('DISCOUNT', best.name, best.reduction.negated()));
    }

    // ---- SiblingDiscountTier ----
    const siblingCount = await this.billingTerms.countEligibleSiblings(
      tenantId,
      terms.billingGuardianId,
      periodStart,
      periodEnd,
      tx,
    );
    const tiers = await this.siblingDiscountTier.findEffective(tenantId, periodStart, tx);
    const applicableTier = tiers
      .filter((t) => t.siblingCountThreshold <= siblingCount)
      .sort((a, b) => b.siblingCountThreshold - a.siblingCountThreshold)[0];
    if (applicableTier) {
      // Which eligible child(ren) receive this reduction is not defined by
      // the frozen documents - EnrollmentBillingTermsService.
      // findEligibleSiblingsForPeriod supplies the sibling list a future
      // selection rule would need, but no rule exists to apply it yet. A
      // genuine, undefined business-rule gap, not decided here.
      throw new Error(
        `PricingEngineService.computeChargesForPeriod: SiblingDiscountTier threshold ${applicableTier.siblingCountThreshold} is met for billing guardian ${terms.billingGuardianId}, but no rule determines which eligible child(ren) receive the reduction`,
      );
    }

    // EXPLICIT: "Waiver applies... against the resulting post-discount
    // subtotal" only has a well-defined meaning if that subtotal is
    // non-negative - flooring here is implementing that phrase correctly,
    // not a new stacking-order decision.
    let postDiscountSubtotal = tuitionAmount.plus(feesSubtotal).minus(discountReductionTotal);
    if (postDiscountSubtotal.lessThan(ZERO)) {
      postDiscountSubtotal = ZERO;
    }

    // ---- Waivers ----
    const waivers = await this.waiver.findEffectiveForPeriod(tenantId, childId, periodStart, periodEnd, tx);
    if (waivers.length > 0) {
      // Approved engineering interpretation: multiple simultaneous Waivers
      // combine additively by summing their percentages, capped at 100% -
      // the frozen documents are silent on multiplicity.
      const percentageSum = waivers.reduce((sum, w) => sum.plus(w.percentage), ZERO);
      const combinedPercentage = Prisma.Decimal.min(percentageSum, HUNDRED);
      const totalWaiverReduction = postDiscountSubtotal.times(combinedPercentage).dividedBy(HUNDRED);
      for (const w of waivers) {
        const share = percentageSum.isZero()
          ? ZERO
          : totalWaiverReduction.times(w.percentage).dividedBy(percentageSum);
        drafts.push(buildDraft('WAIVER', `Waiver (${w.reasonCode})`, share.negated()));
      }
      postDiscountSubtotal = postDiscountSubtotal.minus(totalWaiverReduction);
    }

    // Final floor, per your explicit instruction: mathematically a no-op
    // given the floor above and the 100%-cap on combinedPercentage (which
    // can never take a non-negative base below zero), implemented anyway as
    // a literal, explicit backstop rather than assumed redundant.
    if (postDiscountSubtotal.lessThan(ZERO)) {
      postDiscountSubtotal = ZERO;
    }

    return { billedToGuardianId: terms.billingGuardianId, drafts };
  }
}

function buildDraft(
  sourceType: LineItemDraft['sourceType'],
  description: string,
  amount: Prisma.Decimal,
  planPriceId?: string,
): LineItemDraft {
  // Rounded to 2 decimal places here, matching decimal(12,2) - the
  // convention ADR-0017 already standardized across every monetary field in
  // this system, not a new precision rule invented for this draft. Internal
  // arithmetic (stacking, waiver proration) stays full-precision; rounding
  // happens once, at this output boundary.
  const rounded = amount.toDecimalPlaces(2);
  return {
    sourceType,
    description,
    quantity: '1',
    unitAmount: rounded.toString(),
    totalAmount: rounded.toString(),
    planPriceId,
  };
}
