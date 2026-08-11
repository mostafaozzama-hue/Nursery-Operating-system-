'use client';

import type { Classroom } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClassroomPicker } from '@/components/classrooms/classroom-picker';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { formatAttendanceDate, toTimeInputValue } from '@/lib/attendance/mapper';
import { useAttendanceRecord } from '@/lib/attendance/queries';
import { useUpdateAttendance } from '@/lib/attendance/mutations';
import {
  attendanceCorrectionSchema,
  toUpdateAttendanceRequest,
  type AttendanceCorrectionValues,
} from '@/lib/attendance/schema';

/** OWNER/ADMIN-only correction, matches the backend's PATCH gating. checkedInBy/checkedOutBy/status are never editable here - status is always server-recomputed from the resulting times (see attendance.repository.ts). */
export function AttendanceCorrectionForm({ attendanceId }: { attendanceId: string }) {
  const router = useRouter();
  const existing = useAttendanceRecord(attendanceId);
  const { mutate: updateAttendance, isPending, error: submitError } = useUpdateAttendance();
  const classroomDirectory = useClassroomDirectory();

  // No child directory fetched on this form (unlike AttendanceDetail) - the
  // breadcrumb label here is date-only rather than adding a new network
  // request just to match Detail's fuller "child · date" label.
  useBreadcrumbLabel(
    attendanceId,
    existing.data ? `Attendance · ${formatAttendanceDate(existing.data.date)}` : undefined,
  );

  const [values, setValues] = useState<AttendanceCorrectionValues>({
    classroomId: '',
    checkInTime: '',
    checkOutTime: '',
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AttendanceCorrectionValues, string>>
  >({});

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [showClassroomPicker, setShowClassroomPicker] = useState(false);

  useEffect(() => {
    if (existing.data) {
      setValues({
        classroomId: existing.data.classroomId ?? '',
        checkInTime: existing.data.checkInTime ? toTimeInputValue(existing.data.checkInTime) : '',
        checkOutTime: existing.data.checkOutTime
          ? toTimeInputValue(existing.data.checkOutTime)
          : '',
      });
      setClassroomId(existing.data.classroomId);
    }
  }, [existing.data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = attendanceCorrectionSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof AttendanceCorrectionValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof AttendanceCorrectionValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await updateAttendance(attendanceId, toUpdateAttendanceRequest(result.data, classroomId));
      router.push(`/dashboard/attendance/${attendanceId}`);
    } catch {
      // surfaced via submitError below
    }
  };

  if (existing.isLoading) {
    return <p>Loading…</p>;
  }

  if (existing.error || !existing.data) {
    return (
      <p className="text-destructive">
        {isApiError(existing.error) ? existing.error.message : 'Something went wrong.'}
      </p>
    );
  }

  const classroomName = classroomId
    ? (selectedClassroom?.name ??
      classroomDirectory.byId.get(classroomId)?.name ??
      'Unknown classroom')
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Classroom</Label>
        {showClassroomPicker ? (
          <div className="flex flex-col gap-2">
            <ClassroomPicker
              directory={classroomDirectory}
              onSelect={(classroom) => {
                setSelectedClassroom(classroom);
                setClassroomId(classroom.id);
                setShowClassroomPicker(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowClassroomPicker(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm">{classroomName ?? 'Unassigned'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowClassroomPicker(true)}
            >
              Change
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkInTime">Check-in time</Label>
        <Input
          id="checkInTime"
          type="time"
          value={values.checkInTime}
          onChange={(event) => setValues((prev) => ({ ...prev, checkInTime: event.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Leave blank to clear.</p>
        {fieldErrors.checkInTime && (
          <p className="text-sm text-destructive">{fieldErrors.checkInTime}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkOutTime">Check-out time</Label>
        <Input
          id="checkOutTime"
          type="time"
          value={values.checkOutTime}
          onChange={(event) => setValues((prev) => ({ ...prev, checkOutTime: event.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Leave blank to clear.</p>
        {fieldErrors.checkOutTime && (
          <p className="text-sm text-destructive">{fieldErrors.checkOutTime}</p>
        )}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
