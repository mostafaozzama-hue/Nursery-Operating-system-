/** Matches domain-model.md's ERD block for Waiver.reasonCode exactly. */
export const WAIVER_REASON_CODES = ['OWNER_FAMILY', 'SCHOLARSHIP', 'HARDSHIP', 'STAFF_BENEFIT', 'OTHER'] as const;
export type WaiverReasonCode = (typeof WAIVER_REASON_CODES)[number];
