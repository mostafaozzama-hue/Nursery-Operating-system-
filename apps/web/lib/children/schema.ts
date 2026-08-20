import type { CreateChildRequest } from '@nursery-os/contracts';
import { z } from 'zod';

export const childFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
  gender: z.string().trim(),
  photoUrl: z.string().trim().refine(isBlankOrValidUrl, 'Enter a valid URL'),
  // Easy Enrollment (Product Gap H). Nullable, display/admission fields.
  nickname: z.string().trim(),
  nationality: z.string().trim(),
  motherLanguage: z.string().trim(),
  address: z.string().trim(),
});

export type ChildFormValues = z.infer<typeof childFormSchema>;

export const emptyChildFormValues: ChildFormValues = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  photoUrl: '',
  nickname: '',
  nationality: '',
  motherLanguage: '',
  address: '',
};

export function toCreateChildRequest(values: ChildFormValues): CreateChildRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender.trim() || undefined,
    photoUrl: values.photoUrl.trim() || undefined,
    nickname: values.nickname.trim() || undefined,
    nationality: values.nationality.trim() || undefined,
    motherLanguage: values.motherLanguage.trim() || undefined,
    address: values.address.trim() || undefined,
  };
}

function isBlankOrValidUrl(value: string): boolean {
  if (value === '') return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
