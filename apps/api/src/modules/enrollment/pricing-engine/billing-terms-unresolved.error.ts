/**
 * Thrown by PricingEngineService.computeChargesForPeriod when a child has no
 * resolvable billing terms for the period - either no effective
 * EnrollmentBillingTerms row at all, or a terms row with neither
 * customRateAmount nor planId set (Gap #1, MVP Freeze Review - see
 * docs/SESSION_CHECKPOINT.md §3). An expected, named billing exception, not
 * a system fault: no fallback price is ever invented for either case.
 *
 * BillingRunService.run() catches this per child, logs it at warn level (an
 * anticipated business exception, not a bug), and continues the run for the
 * remaining children - it never produces an invoice for the affected child.
 * Deliberately still folded into the same PARTIAL_FAILURE aggregate status
 * as any other per-child failure; no per-child detail is persisted, per
 * ADR-0017's rejection of a BillingRunEvent audit entity.
 */
export class BillingTermsUnresolvedError extends Error {}
