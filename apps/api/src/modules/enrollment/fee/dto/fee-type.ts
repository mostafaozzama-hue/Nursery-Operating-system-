/** Matches domain-model.md's Fee.type vocabulary exactly. */
export const FEE_TYPES = ['RECURRING', 'ONE_TIME'] as const;
export type FeeType = (typeof FEE_TYPES)[number];
