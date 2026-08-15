import type { ChargeCategory, ManualOverrideReasonCode } from '@nursery-os/contracts';

export const CHARGE_CATEGORY_LABEL: Record<ChargeCategory, string> = {
  LATE_PICKUP: 'Late pickup',
  FIELD_TRIP: 'Field trip',
  DAMAGED_PROPERTY: 'Damaged property',
  OTHER: 'Other',
};

export const MANUAL_OVERRIDE_REASON_CODE_LABEL: Record<ManualOverrideReasonCode, string> = {
  HARDSHIP: 'Hardship',
  SCHOLARSHIP: 'Scholarship',
  STAFF_BENEFIT: 'Staff benefit',
  GOODWILL: 'Goodwill',
  CORRECTION: 'Correction',
  OTHER: 'Other',
};
