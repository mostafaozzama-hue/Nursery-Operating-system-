/** Matches domain-model.md's ManualOverride.reasonCode vocabulary exactly. */
export const MANUAL_OVERRIDE_REASON_CODES = [
  'HARDSHIP',
  'SCHOLARSHIP',
  'STAFF_BENEFIT',
  'GOODWILL',
  'CORRECTION',
  'OTHER',
] as const;
export type ManualOverrideReasonCode = (typeof MANUAL_OVERRIDE_REASON_CODES)[number];
