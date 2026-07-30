/** SiblingDiscountTier-specific 409: effectiveFrom not after the current period's own effectiveFrom, or a lost close-race on the current open tier for a threshold. */
export class SiblingDiscountTierConflictError extends Error {}
