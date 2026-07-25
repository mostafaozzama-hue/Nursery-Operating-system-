import type { CreateClassroomRequest } from '@nursery-os/contracts';
import { z } from 'zod';

export const classroomFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  capacity: z
    .string()
    .trim()
    .min(1, 'Capacity is required')
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      'Capacity must be a whole number of at least 1',
    ),
});

export type ClassroomFormValues = z.infer<typeof classroomFormSchema>;

export const emptyClassroomFormValues: ClassroomFormValues = {
  name: '',
  capacity: '',
};

export function toCreateClassroomRequest(values: ClassroomFormValues): CreateClassroomRequest {
  return {
    name: values.name.trim(),
    capacity: Number(values.capacity),
  };
}
