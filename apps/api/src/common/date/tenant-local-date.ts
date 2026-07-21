/**
 * Computes an unambiguous "today" (or the local calendar date of any
 * instant) in a tenant's own timezone rather than the server's - a tenant
 * in America/New_York and one in Asia/Tokyo must not share the server's
 * UTC day boundary. First built for Attendance's one-record-per-child-per-
 * day invariant; Billing's OVERDUE derivation (comparing dueDate against
 * "today") is a second genuine consumer, meeting this project's bar for
 * promoting something to common/.
 */
export function getTenantLocalDate(timezone: string, at: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(at);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  return new Date(`${year}-${month}-${day}`);
}
