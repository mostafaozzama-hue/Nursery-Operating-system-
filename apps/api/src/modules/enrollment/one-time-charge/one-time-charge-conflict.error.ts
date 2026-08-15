/** Thrown when adding a one-time charge to a non-DRAFT invoice with no reasonCode supplied - required to record the ManualOverride audit, but not something the DTO layer can validate (it depends on the invoice's current status, a DB read). */
export class OneTimeChargeConflictError extends Error {}
