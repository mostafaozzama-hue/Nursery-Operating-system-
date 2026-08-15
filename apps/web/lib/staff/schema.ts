import type { CreateStaffRequest } from '@nursery-os/contracts';
import { z } from 'zod';

/**
 * firstName/lastName are the only required fields, mirroring the backend's
 * CreateStaffDto - everything else stays independently optional ("a bare
 * Staff row with just a name is a legitimate state").
 */
export const staffFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  position: z.string().trim(),
  hireDate: z.string().trim().refine(isBlankOrValidDate, 'Enter a valid date'),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

export const emptyStaffFormValues: StaffFormValues = {
  firstName: '',
  lastName: '',
  position: '',
  hireDate: '',
};

export function toCreateStaffRequest(
  values: StaffFormValues,
  classroomId: string | null,
  userId: string | null,
): CreateStaffRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    position: values.position.trim() || undefined,
    hireDate: values.hireDate.trim() || undefined,
    classroomId: classroomId ?? undefined,
    userId: userId ?? undefined,
  };
}

function isBlankOrValidDate(value: string): boolean {
  return value === '' || !Number.isNaN(Date.parse(value));
}
