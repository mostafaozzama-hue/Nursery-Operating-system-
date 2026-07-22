import { generateRequestId } from './generate-request-id';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('generateRequestId', () => {
  it('passes through a well-formed candidate', () => {
    expect(generateRequestId('abc-123_XYZ')).toBe('abc-123_XYZ');
  });

  it('generates a fresh id when no candidate is given', () => {
    expect(generateRequestId(undefined)).toMatch(UUID_RE);
  });

  it('generates a fresh id for a non-string candidate', () => {
    expect(generateRequestId(['array'])).toMatch(UUID_RE);
  });

  it('generates a fresh id for an empty string', () => {
    expect(generateRequestId('')).toMatch(UUID_RE);
  });

  it('generates a fresh id for a candidate exceeding the length limit', () => {
    expect(generateRequestId('a'.repeat(101))).toMatch(UUID_RE);
  });

  it('generates a fresh id for a candidate with disallowed characters', () => {
    expect(generateRequestId('has spaces')).toMatch(UUID_RE);
    expect(generateRequestId('has/slash')).toMatch(UUID_RE);
    expect(generateRequestId('<script>')).toMatch(UUID_RE);
  });

  it('accepts a candidate at exactly the length limit', () => {
    const id = 'a'.repeat(100);
    expect(generateRequestId(id)).toBe(id);
  });
});
