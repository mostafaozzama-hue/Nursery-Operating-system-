/** Matches domain-model.md's Plan.billingCycle vocabulary exactly. */
export const PLAN_BILLING_CYCLES = ['MONTHLY', 'WEEKLY', 'DAILY'] as const;
export type PlanBillingCycle = (typeof PLAN_BILLING_CYCLES)[number];
