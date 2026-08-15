/** Matches domain-model.md's ERD block for Discount.scope exactly (not restated in the entity-reference prose). */
export const DISCOUNT_SCOPES = ['BASE_TUITION_ONLY', 'ALL_CHARGES'] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPES)[number];
