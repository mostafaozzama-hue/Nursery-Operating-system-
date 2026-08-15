// PaymentAllocation itself has no direct write endpoint (system-internal,
// always a side effect of PaymentService.record - see payments/types.ts).
// The only route this module has is the guardian-level computed credit
// figure: Payment.amount recorded for a guardian minus
// PaymentAllocation.amountApplied applied against their invoices.
export interface AvailableCreditResponse {
  availableCredit: string;
}
