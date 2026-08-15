import type { DiscountScope, DiscountType } from '@nursery-os/contracts';

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  PERCENTAGE: 'Percentage',
  FIXED_AMOUNT: 'Fixed amount',
};

export const DISCOUNT_SCOPE_LABEL: Record<DiscountScope, string> = {
  BASE_TUITION_ONLY: 'Base tuition only',
  ALL_CHARGES: 'All charges',
};
