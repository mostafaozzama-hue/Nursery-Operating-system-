export const CHARGE_CATEGORIES = ['LATE_PICKUP', 'FIELD_TRIP', 'DAMAGED_PROPERTY', 'OTHER'] as const;
export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number];
