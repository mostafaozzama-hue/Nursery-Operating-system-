import { containsInsensitive } from './query-filters.util';

describe('containsInsensitive', () => {
  it('returns a case-insensitive contains filter when a value is given', () => {
    expect(containsInsensitive('ava')).toEqual({ contains: 'ava', mode: 'insensitive' });
  });

  it('returns undefined for an empty string', () => {
    expect(containsInsensitive('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(containsInsensitive(undefined)).toBeUndefined();
  });
});
