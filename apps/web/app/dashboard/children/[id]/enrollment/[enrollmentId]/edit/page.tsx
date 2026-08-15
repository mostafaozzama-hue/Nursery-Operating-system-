import { EditReasonForm } from '@/components/enrollments/edit-reason-form';

export const metadata = { title: 'Edit Enrollment Reason · Nursery OS' };

export default async function EditEnrollmentReasonPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>;
}) {
  const { id, enrollmentId } = await params;
  return <EditReasonForm childId={id} enrollmentId={enrollmentId} />;
}
