import { TransferForm } from '@/components/enrollments/transfer-form';

export const metadata = { title: 'Transfer Classroom · Nursery OS' };

export default async function TransferEnrollmentPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <TransferForm childId={id} enrollmentId={enrollmentId} />;
}
