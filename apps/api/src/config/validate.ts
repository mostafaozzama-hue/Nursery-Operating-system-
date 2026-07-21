import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './environment-variables';

function assertValidPemKey(base64Value: string, name: string): void {
  const decoded = Buffer.from(base64Value, 'base64').toString('utf8');
  if (!decoded.includes('-----BEGIN')) {
    throw new Error(
      `${name} does not decode to a valid PEM key (expected base64-encoded PEM containing "-----BEGIN")`,
    );
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

  return validatedConfig;
}
