import { getTenantLocalDate } from './tenant-local-date';

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
