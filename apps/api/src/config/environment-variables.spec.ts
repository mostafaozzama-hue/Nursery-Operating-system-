import { validate } from './validate';

const validPemBase64 = Buffer.from('-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----').toString(
  'base64',
);

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_ACCESS_TOKEN_PRIVATE_KEY: validPemBase64,
    JWT_ACCESS_TOKEN_PUBLIC_KEY: validPemBase64,
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    ...overrides,
  };
}

describe('environment validation', () => {
  it('accepts a fully valid config', () => {
    expect(() => validate(baseConfig())).not.toThrow();
  });

  it('rejects a config missing DATABASE_URL', () => {
    const config = baseConfig();
    delete (config as Record<string, unknown>).DATABASE_URL;
    expect(() => validate(config)).toThrow();
  });

  it('rejects a malformed DATABASE_URL scheme', () => {
    expect(() => validate(baseConfig({ DATABASE_URL: 'mysql://user:pass@localhost/db' }))).toThrow();
  });

  it('rejects a config missing JWT_ACCESS_TOKEN_PRIVATE_KEY', () => {
    const config = baseConfig();
    delete (config as Record<string, unknown>).JWT_ACCESS_TOKEN_PRIVATE_KEY;
    expect(() => validate(config)).toThrow();
  });

  it('rejects a config missing JWT_ACCESS_TOKEN_PUBLIC_KEY', () => {
    const config = baseConfig();
    delete (config as Record<string, unknown>).JWT_ACCESS_TOKEN_PUBLIC_KEY;
    expect(() => validate(config)).toThrow();
  });

  it('rejects a JWT key that does not decode to a PEM value', () => {
    const notPem = Buffer.from('just some random text').toString('base64');
    expect(() => validate(baseConfig({ JWT_ACCESS_TOKEN_PRIVATE_KEY: notPem }))).toThrow(
      /does not decode to a valid PEM key/,
    );
  });

  it('rejects a config missing CORS_ALLOWED_ORIGINS', () => {
    const config = baseConfig();
    delete (config as Record<string, unknown>).CORS_ALLOWED_ORIGINS;
    expect(() => validate(config)).toThrow();
  });

  it('defaults PORT to 3001 when omitted', () => {
    const result = validate(baseConfig());
    expect(result.PORT).toBe(3001);
  });

  it('defaults NODE_ENV to development when omitted', () => {
    const result = validate(baseConfig());
    expect(result.NODE_ENV).toBe('development');
  });

  it('rejects an invalid NODE_ENV value', () => {
    expect(() => validate(baseConfig({ NODE_ENV: 'staging' }))).toThrow();
  });

  it("resolves COOKIE_SECURE='false' to boolean false, not true", () => {
    const result = validate(baseConfig({ COOKIE_SECURE: 'false' }));
    expect(result.COOKIE_SECURE).toBe(false);
  });

  it('resolves COOKIE_SECURE=true to boolean true', () => {
    const result = validate(baseConfig({ COOKIE_SECURE: 'true' }));
    expect(result.COOKIE_SECURE).toBe(true);
  });

  it('defaults COOKIE_SECURE to false when omitted', () => {
    const result = validate(baseConfig());
    expect(result.COOKIE_SECURE).toBe(false);
  });
});
