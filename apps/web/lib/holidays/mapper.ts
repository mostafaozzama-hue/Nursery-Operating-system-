import type { HolidayType } from '@nursery-os/contracts';

export const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
  FULL_CLOSURE: 'Full closure',
  PARTIAL_CLOSURE: 'Partial closure',
};

/** date is @db.Date (calendar date, no time-of-day component) - no UTC handling needed, same shape as PlanPrice/SiblingDiscountTier's effectiveFrom/effectiveTo. */
export function formatHolidayDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

/**
 * earlyCloseTime is a wall-clock value with no real calendar date (same @db.Time shape as
 * Plan.scheduleStartTime/scheduleEndTime, always stored on epoch 1970-01-01) - reading it through
 * the browser's local timezone would silently shift the displayed hour. Force the formatter's
 * timeZone to 'UTC', mirroring lib/plans/mapper.ts's formatTimeOfDay exactly.
 */
export function formatEarlyCloseTime(time: string | null): string {
  if (!time) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(time));
}

/** Same UTC-wall-clock reasoning as formatEarlyCloseTime, but returns a raw "HH:mm" for prefilling an `<input type="time">`, mirroring lib/plans/mapper.ts's toTimeInputValue exactly. */
export function toTimeInputValue(time: string): string {
  const date = new Date(time);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
