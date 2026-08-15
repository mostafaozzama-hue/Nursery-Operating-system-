import { Suspense } from 'react';
import { AttendanceList } from '@/components/attendance/attendance-list';

export const metadata = { title: 'Attendance history · Nursery OS' };

export default function AttendanceHistoryPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AttendanceList />
    </Suspense>
  );
}
