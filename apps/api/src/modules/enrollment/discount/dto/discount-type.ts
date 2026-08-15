/** Matches domain-model.md's Discount.type vocabulary exactly. */
export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
