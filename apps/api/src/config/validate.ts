import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables, NodeEnv } from './environment-variables';

function assertValidPemKey(base64Value: string, name: string): void {
  const decoded = Buffer.from(base64Value, 'base64').toString('utf8');
  if (!decoded.includes('-----BEGIN')) {
    throw new Error(
      `${name} does not decode to a valid PEM key (expected base64-encoded PEM containing "-----BEGIN")`,
    );
  }
}

// Fail closed rather than silently forcing the flag: a production deployment
// that never set COOKIE_SECURE=true has a real misconfiguration worth
// surfacing at boot, not one we should mask by overriding it ourselves.
function assertCookieSecureInProduction(config: EnvironmentVariables): void {
  if (config.NODE_ENV === NodeEnv.Production && config.COOKIE_SECURE !== true) {
    throw new Error('COOKIE_SECURE must be true when NODE_ENV=production');
  }
}

// CORS is combined with credentials: true, so a wildcard origin is never a
// valid value here regardless of environment - reject it at boot rather
// than let it reach enableCors(). Checks for any `*` character, not just an
// exact "*" element, so subdomain-glob patterns like "*.example.com" are
// caught too - the underlying cors package doesn't expand those into a
// live grant for plain string entries, but the config itself is still not
// something we've decided to support.
function assertNoWildcardOrigins(config: EnvironmentVariables): void {
  if (config.CORS_ALLOWED_ORIGINS.some((origin) => origin.includes('*'))) {
    throw new Error('CORS_ALLOWED_ORIGINS must not contain a wildcard (*)');
  }
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.toString()}`);
  }

  assertValidPemKey(validatedConfig.JWT_ACCESS_TOKEN_PRIVATE_KEY, 'JWT_ACCESS_TOKEN_PRIVATE_KEY');
  assertValidPemKey(validatedConfig.JWT_ACCESS_TOKEN_PUBLIC_KEY, 'JWT_ACCESS_TOKEN_PUBLIC_KEY');
  assertCookieSecureInProduction(validatedConfig);
  assertNoWildcardOrigins(validatedConfig);

  return validatedConfig;
}
