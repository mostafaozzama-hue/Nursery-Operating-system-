/** Matches domain-model.md's EnrollmentBillingTerms.depositRefundPolicy vocabulary exactly. */
export const DEPOSIT_REFUND_POLICIES = ['FORFEIT', 'APPLY_TO_FINAL', 'NON_REFUNDABLE'] as const;
export type DepositRefundPolicy = (typeof DEPOSIT_REFUND_POLICIES)[number];
