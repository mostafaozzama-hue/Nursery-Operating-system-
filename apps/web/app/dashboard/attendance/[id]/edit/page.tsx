import { AttendanceCorrectionForm } from '@/components/attendance/attendance-correction-form';

export const metadata = { title: 'Correct attendance · Nursery OS' };

export default async function EditAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttendanceCorrectionForm attendanceId={id} />;
}
