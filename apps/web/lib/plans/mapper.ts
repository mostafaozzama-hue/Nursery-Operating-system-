import {
  PLAN_DAYS_OF_WEEK,
  type PlanBillingCycle,
  type PlanDayOfWeek,
} from '@nursery-os/contracts';

export const PLAN_BILLING_CYCLE_LABEL: Record<PlanBillingCycle, string> = {
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  DAILY: 'Daily',
};

export const PLAN_DAY_OF_WEEK_LABEL: Record<PlanDayOfWeek, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

/** Renders the selected days in calendar order, not selection order, and collapses a full week to "Every day" rather than a 7-item list. */
export function formatScheduleDays(days: PlanDayOfWeek[]): string {
  if (days.length === 0) return '—';
  if (days.length === 7) return 'Every day';
  return PLAN_DAYS_OF_WEEK.filter((day) => days.includes(day))
    .map((day) => PLAN_DAY_OF_WEEK_LABEL[day])
    .join(', ');
}

/**
 * scheduleStartTime/scheduleEndTime are wall-clock values with no real
 * calendar date (same @db.Time shape as Attendance's checkInTime/
 * checkOutTime, always stored on epoch 1970-01-01) - reading them through
 * the browser's local timezone would silently shift the displayed hour.
 * Force the formatter's timeZone to 'UTC', mirroring
 * lib/attendance/mapper.ts's formatAttendanceTime exactly.
 */
function formatTimeOfDay(time: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(time));
}

export function formatScheduleWindow(startTime: string | null, endTime: string | null): string {
  if (!startTime && !endTime) return 'Any time';
  if (startTime && endTime) return `${formatTimeOfDay(startTime)}–${formatTimeOfDay(endTime)}`;
  return formatTimeOfDay(startTime ?? endTime!);
}

/** Same UTC-wall-clock reasoning as formatScheduleWindow, but returns a raw "HH:mm" for prefilling an `<input type="time">`, mirroring lib/attendance/mapper.ts's toTimeInputValue exactly. */
export function toTimeInputValue(time: string): string {
  const date = new Date(time);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
