/**
 * Attendance's one-record-per-child-per-day invariant needs an unambiguous
 * "today," computed in the tenant's own timezone rather than the server's -
 * a tenant in America/New_York and one in Asia/Tokyo must not share the
 * server's UTC day boundary. Kept local to this module (not common/) since
 * Attendance is its only consumer so far.
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

/**
 * checkInTime/checkOutTime are @db.Time columns (wall-clock, no timezone of
 * their own) - the value stored should read as "what the clock on the wall
 * said," i.e. the tenant's local wall-clock time. Built with Date.UTC
 * (never local setters): a `time`/timestamp-without-timezone value is a
 * pure HH:mm:ss reading with no zone attached, and the only way to make
 * that round-trip predictably through Date's toISOString()-based JSON
 * serialization - which always renders in UTC - is to construct it in UTC
 * to begin with. Local setters were tried first and failed a round-trip
 * e2e test: the server's local-timezone rules for the arbitrary epoch date
 * (1970-01-01) don't match its current-day offset, shifting the stored
 * hour unpredictably.
 */
export function tenantLocalTimeAsDate(timezone: string, at: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(at);
  const hour = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')!.value);
  const second = Number(parts.find((p) => p.type === 'second')!.value);

  return new Date(Date.UTC(1970, 0, 1, hour, minute, second));
}

/** Parses a client-supplied "HH:mm" or "HH:mm:ss" override - already tenant-local wall-clock, no further conversion needed. */
export function parseTimeOfDay(value: string): Date {
  const [hourStr, minuteStr, secondStr = '0'] = value.split(':');
  return new Date(Date.UTC(1970, 0, 1, Number(hourStr), Number(minuteStr), Number(secondStr)));
}
