import { EnrollForm } from '@/components/enrollments/enroll-form';

export const metadata = { title: 'Enroll · Nursery OS' };

export default async function NewEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EnrollForm childId={id} />;
}
