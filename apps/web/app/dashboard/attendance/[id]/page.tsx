import { AttendanceDetail } from '@/components/attendance/attendance-detail';

export const metadata = { title: 'Attendance · Nursery OS' };

export default async function AttendanceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AttendanceDetail attendanceId={id} />;
}
