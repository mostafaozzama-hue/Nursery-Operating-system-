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
