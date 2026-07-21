import { registerDecorator, ValidationOptions } from 'class-validator';

function isValidIanaTimezone(value: unknown): boolean {
  if (typeof value !== 'string' || !value) {
    return false;
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Rejects any string Intl doesn't recognize as a real IANA timezone (e.g. "America/New_York", "UTC"). */
export function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isValidIanaTimezone(value);
        },
        defaultMessage() {
          return `${propertyName} must be a valid IANA timezone (e.g. "America/New_York")`;
        },
      },
    });
  };
}
