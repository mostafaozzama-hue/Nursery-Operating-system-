import { ClassroomForm } from '@/components/classrooms/classroom-form';

export const metadata = { title: 'Edit Classroom · Nursery OS' };

export default async function EditClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassroomForm mode="edit" classroomId={id} />;
}
