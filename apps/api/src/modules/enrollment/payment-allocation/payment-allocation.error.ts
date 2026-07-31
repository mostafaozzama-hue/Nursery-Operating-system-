/** Defensive boundary only - allocating more than a payment's recorded amount should be structurally unreachable given PaymentAllocationService computes the split itself (§8), the same way InvoiceConflictError('This payment would exceed the outstanding balance') already guarded the equivalent case in the pre-Configuration-Engine model. */
export class PaymentAllocationError extends Error {}
