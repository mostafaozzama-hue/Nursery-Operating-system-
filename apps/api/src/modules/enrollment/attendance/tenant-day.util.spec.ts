import { getTenantLocalDate, parseTimeOfDay, tenantLocalTimeAsDate } from './tenant-day.util';

describe('getTenantLocalDate', () => {
  it('returns the calendar date in the given timezone', () => {
    // 2024-01-01T04:30:00Z is still 2023-12-31 in America/Los_Angeles (UTC-8).
    const at = new Date('2024-01-01T04:30:00Z');
    const laDate = getTenantLocalDate('America/Los_Angeles', at);
    expect(laDate.toISOString().slice(0, 10)).toBe('2023-12-31');

    const utcDate = getTenantLocalDate('UTC', at);
    expect(utcDate.toISOString().slice(0, 10)).toBe('2024-01-01');
  });
});

describe('tenantLocalTimeAsDate', () => {
  it('extracts the wall-clock time in the given timezone, encoded via UTC getters', () => {
    // 2024-06-01T13:00:00Z is 09:00 in America/New_York (UTC-4 during DST).
    // Encoded with Date.UTC so it round-trips predictably through
    // toISOString() regardless of the server's own local timezone/DST rules.
    const at = new Date('2024-06-01T13:00:00Z');
    const result = tenantLocalTimeAsDate('America/New_York', at);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });
});

describe('parseTimeOfDay', () => {
  it('parses an HH:mm string', () => {
    const result = parseTimeOfDay('08:45');
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCMinutes()).toBe(45);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it('parses an HH:mm:ss string', () => {
    const result = parseTimeOfDay('08:45:30');
    expect(result.getUTCSeconds()).toBe(30);
  });
});
