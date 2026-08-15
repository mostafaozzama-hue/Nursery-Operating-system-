import { ClassroomDetail } from '@/components/classrooms/classroom-detail';

export const metadata = { title: 'Classroom · Nursery OS' };

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassroomDetail classroomId={id} />;
}
