/** Matches domain-model.md's Holiday.type vocabulary exactly. */
export const HOLIDAY_TYPES = ['FULL_CLOSURE', 'PARTIAL_CLOSURE'] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];
