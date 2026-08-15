import { ClassroomForm } from '@/components/classrooms/classroom-form';

export const metadata = { title: 'Add Classroom · Nursery OS' };

export default function NewClassroomPage() {
  return <ClassroomForm mode="create" />;
}
