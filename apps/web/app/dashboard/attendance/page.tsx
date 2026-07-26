import { Suspense } from 'react';
import { ClassroomAttendanceRoster } from '@/components/attendance/classroom-attendance-roster';

export const metadata = { title: 'Attendance · Nursery OS' };

export default function AttendancePage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ClassroomAttendanceRoster />
    </Suspense>
  );
}
