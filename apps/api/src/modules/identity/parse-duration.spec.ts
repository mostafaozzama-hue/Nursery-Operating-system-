import { parseDurationMs } from './parse-duration';

describe('parseDurationMs', () => {
  it('parses minutes', () => {
    expect(parseDurationMs('15m')).toBe(15 * 60_000);
  });

  it('parses hours', () => {
    expect(parseDurationMs('2h')).toBe(2 * 3_600_000);
  });

  it('parses days', () => {
    expect(parseDurationMs('30d')).toBe(30 * 86_400_000);
  });

  it('trims surrounding whitespace', () => {
    expect(parseDurationMs(' 30d ')).toBe(30 * 86_400_000);
  });

  it.each(['30', '30x', 'd30', '', '15.5m', '-5m'])(
    'throws on invalid input %p',
    (value) => {
      expect(() => parseDurationMs(value)).toThrow(/Invalid duration/);
    },
  );
});
