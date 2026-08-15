import type { AttendanceStatus } from '@nursery-os/contracts';

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  ABSENT: 'Absent',
};

export const ATTENDANCE_STATUS_BADGE_VARIANT: Record<
  AttendanceStatus,
  'success' | 'muted' | 'warning'
> = {
  CHECKED_IN: 'success',
  CHECKED_OUT: 'muted',
  ABSENT: 'warning',
};

export function formatAttendanceDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

/**
 * checkInTime/checkOutTime are wall-clock values with no real calendar date
 * (backend always stores them on epoch 1970-01-01, see tenant-day.util.ts) -
 * reading them through the browser's local timezone (toLocaleTimeString)
 * would silently shift the displayed hour. Force the formatter's timeZone
 * to 'UTC' instead, mirroring the same technique the backend's own
 * tenant-local-date.ts uses for the inverse problem.
 */
export function formatAttendanceTime(time: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(time));
}

/** Same UTC-wall-clock reasoning as formatAttendanceTime, but returns a raw "HH:mm" for prefilling an `<input type="time">`, which always reads/writes HH:mm in the DOM regardless of display locale. */
export function toTimeInputValue(time: string): string {
  const date = new Date(time);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Tenant-local "today" isn't available to the frontend yet (no tenant-timezone endpoint) - browser-local date is used as a documented, accepted stand-in, matching the tenant's own timezone in virtually every real deployment (an on-site front-desk device). */
export function todayLocalDate(): string {
  return new Date().toLocaleDateString('en-CA');
}
