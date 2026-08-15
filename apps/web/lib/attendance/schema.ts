import type { UpdateAttendanceRequest } from '@nursery-os/contracts';
import { z } from 'zod';

/** Mirrors the backend's TIME_OF_DAY_PATTERN (time-of-day.pattern.ts) exactly. */
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

const timeField = z
  .string()
  .trim()
  .refine((value) => value === '' || TIME_OF_DAY_PATTERN.test(value), {
    message: 'Enter a valid time (HH:mm)',
  });

/** Corrections only (OWNER/ADMIN) - classroom + times, same shape as UpdateAttendanceDto. Blank time = clear it (mapped to null). */
export const attendanceCorrectionSchema = z.object({
  classroomId: z.string().trim(),
  checkInTime: timeField,
  checkOutTime: timeField,
});

export type AttendanceCorrectionValues = z.infer<typeof attendanceCorrectionSchema>;

export function toUpdateAttendanceRequest(
  values: AttendanceCorrectionValues,
  classroomId: string | null,
): UpdateAttendanceRequest {
  return {
    classroomId: classroomId ?? undefined,
    checkInTime: values.checkInTime.trim() === '' ? null : values.checkInTime.trim(),
    checkOutTime: values.checkOutTime.trim() === '' ? null : values.checkOutTime.trim(),
  };
}
