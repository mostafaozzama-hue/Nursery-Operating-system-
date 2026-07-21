/** Invoice-specific 409: wrong-status mutation attempts (line-item edits post-issue, payment against a non-payable invoice, double-void, overpayment, missing dueDate at issue). */
export class InvoiceConflictError extends Error {}
