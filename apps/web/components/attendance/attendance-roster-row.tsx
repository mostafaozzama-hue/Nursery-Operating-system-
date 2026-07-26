'use client';

import type { ClassroomRosterRow } from '@/lib/attendance/queries';
import { Badge } from '@/components/common/badge';
import { fullName } from '@/lib/children/mapper';
import { formatAttendanceTime } from '@/lib/attendance/mapper';

const STATUS_LABEL: Record<ClassroomRosterRow['status'], string> = {
  NOT_YET: 'Not checked in',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  ABSENT: 'Absent',
};

const STATUS_VARIANT: Record<ClassroomRosterRow['status'], 'muted' | 'success' | 'warning'> = {
  NOT_YET: 'muted',
  CHECKED_IN: 'success',
  CHECKED_OUT: 'muted',
  ABSENT: 'warning',
};

/**
 * The primary tap target on the daily roster (design-system.md §6.2) - the
 * whole row is the target, well above the 44px minimum, tapping opens the
 * per-child action sheet rather than exposing separate small buttons here.
 */
export function AttendanceRosterRow({
  row,
  onSelect,
}: {
  row: ClassroomRosterRow;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-start hover:bg-muted"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{fullName(row.child)}</span>
        {row.attendance?.checkInTime && (
          <span className="text-xs text-muted-foreground">
            In {formatAttendanceTime(row.attendance.checkInTime)}
            {row.attendance.checkOutTime &&
              ` · Out ${formatAttendanceTime(row.attendance.checkOutTime)}`}
          </span>
        )}
      </div>
      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
    </button>
  );
}
