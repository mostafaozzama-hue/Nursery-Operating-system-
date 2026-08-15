/** Thrown when generateForPeriod is called for a period whose BillingRun already has invoices and none of them are still DRAFT - nothing left to regenerate. Never thrown for the ordinary idempotent-rerun case (at least one invoice still DRAFT, or no invoices exist yet). */
export class BillingRunConflictError extends Error {}
