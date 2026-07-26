'use client';

import type { ClassroomRosterRow } from '@/lib/attendance/queries';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { fullName } from '@/lib/children/mapper';
import { formatAttendanceTime } from '@/lib/attendance/mapper';
import { isApiError } from '@/lib/api/errors';
import { useCheckIn, useCheckOut, useMarkAbsent } from '@/lib/attendance/mutations';

/**
 * Bottom-sheet drawer per design-system.md §6.2/§5.13 - never a centered
 * modal for a teacher-facing action. Actions sit in SheetFooter, which is
 * `mt-auto` inside the sheet's flex column, giving the sticky-bottom-action-
 * bar behavior §6.2 calls for without a separate component.
 */
export function AttendanceActionSheet({
  row,
  classroomId,
  open,
  onOpenChange,
  onDone,
}: {
  row: ClassroomRosterRow | null;
  classroomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { mutate: checkIn, isPending: isCheckingIn, error: checkInError } = useCheckIn();
  const { mutate: checkOut, isPending: isCheckingOut, error: checkOutError } = useCheckOut();
  const {
    mutate: markAbsent,
    isPending: isMarkingAbsent,
    error: markAbsentError,
  } = useMarkAbsent();

  if (!row) return null;

  const error = checkInError ?? checkOutError ?? markAbsentError;
  const isPending = isCheckingIn || isCheckingOut || isMarkingAbsent;

  const handleCheckIn = async () => {
    try {
      await checkIn({ childId: row.child.id, classroomId });
      onDone();
    } catch {
      // surfaced via `error` below
    }
  };

  const handleCheckOut = async () => {
    if (!row.attendance) return;
    try {
      await checkOut(row.attendance.id, {});
      onDone();
    } catch {
      // surfaced via `error` below
    }
  };

  const handleMarkAbsent = async () => {
    try {
      await markAbsent({ childId: row.child.id, classroomId });
      onDone();
    } catch {
      // surfaced via `error` below
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{fullName(row.child)}</SheetTitle>
          <SheetDescription>
            {row.status === 'NOT_YET' && 'Not checked in yet today.'}
            {row.status === 'CHECKED_IN' &&
              row.attendance?.checkInTime &&
              `Checked in at ${formatAttendanceTime(row.attendance.checkInTime)}.`}
            {row.status === 'CHECKED_OUT' &&
              row.attendance?.checkOutTime &&
              `Checked out at ${formatAttendanceTime(row.attendance.checkOutTime)}. Corrections are made from Attendance history.`}
            {row.status === 'ABSENT' &&
              'Marked absent today. Corrections are made from Attendance history.'}
          </SheetDescription>
        </SheetHeader>

        {error != null && (
          <p className="px-4 text-sm text-destructive">
            {isApiError(error) ? error.message : 'Something went wrong.'}
          </p>
        )}

        {(row.status === 'NOT_YET' || row.status === 'CHECKED_IN') && (
          <SheetFooter>
            {row.status === 'NOT_YET' && (
              <>
                <Button size="touch" variant="success" disabled={isPending} onClick={handleCheckIn}>
                  {isCheckingIn ? 'Checking in…' : 'Check in'}
                </Button>
                <Button
                  size="touch"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleMarkAbsent}
                >
                  {isMarkingAbsent ? 'Marking absent…' : 'Mark absent'}
                </Button>
              </>
            )}
            {row.status === 'CHECKED_IN' && (
              <Button size="touch" disabled={isPending} onClick={handleCheckOut}>
                {isCheckingOut ? 'Checking out…' : 'Check out'}
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
