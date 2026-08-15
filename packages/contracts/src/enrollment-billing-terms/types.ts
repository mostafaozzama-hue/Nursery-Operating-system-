// Matches domain-model.md's EnrollmentBillingTerms.depositRefundPolicy vocabulary exactly.
export const DEPOSIT_REFUND_POLICIES = ['FORFEIT', 'APPLY_TO_FINAL', 'NON_REFUNDABLE'] as const;
export type DepositRefundPolicy = (typeof DEPOSIT_REFUND_POLICIES)[number];

/**
 * customRateAmount/depositAmount are strings, not numbers - both are Prisma
 * Decimal columns (@db.Decimal(12,2)), which serialize as JSON strings over
 * the wire, the same as Fee.amount/PlanPrice.amount. No history/list
 * endpoint exists - GET only ever returns the current segment.
 */
export interface EnrollmentBillingTerms {
  id: string;
  enrollmentId: string;
  planId: string | null;
  billingGuardianId: string;
  customRateAmount: string | null;
  customRateReason: string | null;
  depositAmount: string | null;
  depositRefundPolicy: DepositRefundPolicy | null;
  withdrawalNoticeGivenDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Embedded, optional sub-object on CreateEnrollmentRequest - billing terms are opt-in at enrollment creation, not mandatory. billingGuardianId is the only required field when this object is supplied at all. */
export interface OpenBillingTermsRequest {
  planId?: string;
  billingGuardianId: string;
  customRateAmount?: number;
  customRateReason?: string;
  depositAmount?: number;
  depositRefundPolicy?: DepositRefundPolicy;
  withdrawalNoticeGivenDate?: string;
}

/**
 * Deliberately omits immediate/reasonCode/reasonNote - the backend's
 * ChangeBillingTermsDto supports a mid-cycle OWNER/ADMIN override path via
 * those fields, but Sprint 3 only builds the standard, future-effective
 * workflow. effectiveFrom must be strictly after today; the backend
 * rejects anything else with a real 409 message, same pattern as
 * PlanPriceConflictError.
 */
export interface ChangeBillingTermsRequest {
  effectiveFrom: string;
  planId?: string;
  billingGuardianId?: string;
  customRateAmount?: number;
  customRateReason?: string;
  depositAmount?: number;
  depositRefundPolicy?: DepositRefundPolicy;
  withdrawalNoticeGivenDate?: string;
}
