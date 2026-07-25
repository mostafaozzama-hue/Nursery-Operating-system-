import { WithdrawForm } from '@/components/enrollments/withdraw-form';

export const metadata = { title: 'Withdraw · Nursery OS' };

export default async function WithdrawEnrollmentPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <WithdrawForm childId={id} enrollmentId={enrollmentId} />;
}
