'use client';

import { CalendarCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/common/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ClassroomPicker } from '@/components/classrooms/classroom-picker';
import { isApiError } from '@/lib/api/errors';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { useClassroomRosterToday, type ClassroomRosterRow } from '@/lib/attendance/queries';
import { AttendanceActionSheet } from './attendance-action-sheet';
import { AttendanceRosterRow } from './attendance-roster-row';

const TODAY_LABEL = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function ClassroomAttendanceRoster() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroomId');

  const { byId: classroomsById } = useClassroomDirectory();
  const { rows, isLoading, error, refetch } = useClassroomRosterToday(classroomId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ClassroomRosterRow | null>(null);

  const selectClassroom = (id: string) => {
    router.replace(`/dashboard/attendance?classroomId=${id}`);
    setPickerOpen(false);
  };

  const classroomName = classroomId ? (classroomsById.get(classroomId)?.name ?? '…') : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">{TODAY_LABEL}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/attendance/history">History</Link>
          </Button>
          <Button size="touch" variant="outline" onClick={() => setPickerOpen(true)}>
            {classroomName ?? 'Select classroom'}
          </Button>
        </div>
      </div>

      {classroomId === null ? (
        <EmptyState icon={CalendarCheckIcon} message="Select a classroom to see today's roster." />
      ) : error ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">
            {isApiError(error) ? error.message : 'Something went wrong.'}
          </p>
          <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="No children currently enrolled in this classroom." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <AttendanceRosterRow
              key={row.child.id}
              row={row}
              onSelect={() => setSelectedRow(row)}
            />
          ))}
        </div>
      )}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Select classroom</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ClassroomPicker onSelect={(classroom) => selectClassroom(classroom.id)} />
          </div>
        </SheetContent>
      </Sheet>

      <AttendanceActionSheet
        row={selectedRow}
        classroomId={classroomId ?? ''}
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
        onDone={() => {
          setSelectedRow(null);
          refetch();
        }}
      />
    </div>
  );
}
