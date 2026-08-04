export const CHARGE_CATEGORIES = [
  'LATE_PICKUP',
  'FIELD_TRIP',
  'DAMAGED_PROPERTY',
  'OTHER',
] as const;
export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number];

/** Matches domain-model.md's ManualOverride.reasonCode vocabulary - a distinct vocabulary from WaiverReasonCode, not reused (GOODWILL/CORRECTION have no Waiver equivalent, OWNER_FAMILY has no ManualOverride equivalent). */
export const MANUAL_OVERRIDE_REASON_CODES = [
  'HARDSHIP',
  'SCHOLARSHIP',
  'STAFF_BENEFIT',
  'GOODWILL',
  'CORRECTION',
  'OTHER',
] as const;
export type ManualOverrideReasonCode = (typeof MANUAL_OVERRIDE_REASON_CODES)[number];

export interface AddOneTimeChargeRequest {
  description: string;
  quantity: number;
  unitAmount: number;
  chargeCategory: ChargeCategory;
  /** Required when the target invoice is not currently DRAFT - a server-state rule, not enforced by this type. */
  reasonCode?: ManualOverrideReasonCode;
  /** Required when reasonCode is 'OTHER' - a server-state rule, not enforced by this type. */
  reasonNote?: string;
}
