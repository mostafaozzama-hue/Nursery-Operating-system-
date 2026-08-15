/** Matches domain-model.md's ERD block for Waiver.type exactly. */
export const WAIVER_TYPES = ['FULL', 'PARTIAL'] as const;
export type WaiverType = (typeof WAIVER_TYPES)[number];
