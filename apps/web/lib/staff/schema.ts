import type { CreateStaffRequest } from '@nursery-os/contracts';
import { z } from 'zod';

/**
 * Every field is independently optional, mirroring the backend's own
 * CreateStaffDto design ("a bare Staff row with only a userId link is a
 * legitimate state") - there is no required-field validation here at all.
 */
export const staffFormSchema = z.object({
  position: z.string().trim(),
  hireDate: z.string().trim().refine(isBlankOrValidDate, 'Enter a valid date'),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

export const emptyStaffFormValues: StaffFormValues = {
  position: '',
  hireDate: '',
};

export function toCreateStaffRequest(
  values: StaffFormValues,
  classroomId: string | null,
  userId: string | null,
): CreateStaffRequest {
  return {
    position: values.position.trim() || undefined,
    hireDate: values.hireDate.trim() || undefined,
    classroomId: classroomId ?? undefined,
    userId: userId ?? undefined,
  };
}

function isBlankOrValidDate(value: string): boolean {
  return value === '' || !Number.isNaN(Date.parse(value));
}
