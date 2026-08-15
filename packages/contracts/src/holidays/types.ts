import type { PaginationQuery } from '../common/pagination';

// Matches domain-model.md's Holiday.type vocabulary exactly.
export const HOLIDAY_TYPES = ['FULL_CLOSURE', 'PARTIAL_CLOSURE'] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export const HOLIDAY_SORT_FIELDS = ['date', 'name', 'type', 'createdAt'] as const;
export type HolidaySortField = (typeof HOLIDAY_SORT_FIELDS)[number];

/** earlyCloseTime is a string - Holiday.earlyCloseTime is a Prisma @db.Time column, serialized as an epoch-anchored (1970-01-01) UTC ISO string, same shape as Plan.scheduleStartTime/scheduleEndTime. date is @db.Date, also a string. */
export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  earlyCloseTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayQuery extends PaginationQuery {
  type?: HolidayType;
  date?: string;
  sortBy?: HolidaySortField;
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
  type: HolidayType;
  earlyCloseTime?: string;
}

export interface UpdateHolidayRequest {
  date?: string;
  name?: string;
  type?: HolidayType;
  earlyCloseTime?: string | null;
}
