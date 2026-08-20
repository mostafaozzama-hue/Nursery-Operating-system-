import type { CreateGuardianRequest } from '@nursery-os/contracts';
import { z } from 'zod';

export const guardianFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phone: z.string().trim(),
    email: z.string().trim().refine(isBlankOrValidEmail, 'Enter a valid email address'),
    // Easy Enrollment (Product Gap H). Nullable.
    address: z.string().trim(),
  })
  .refine((values) => values.phone !== '' || values.email !== '', {
    message: 'Provide at least a phone number or an email address',
    path: ['phone'],
  });

export type GuardianFormValues = z.infer<typeof guardianFormSchema>;

export const emptyGuardianFormValues: GuardianFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
};

export function toCreateGuardianRequest(values: GuardianFormValues): CreateGuardianRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
    address: values.address.trim() || undefined,
  };
}

function isBlankOrValidEmail(value: string): boolean {
  return value === '' || z.string().email().safeParse(value).success;
}
