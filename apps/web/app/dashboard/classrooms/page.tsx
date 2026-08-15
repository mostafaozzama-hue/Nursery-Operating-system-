import { Suspense } from 'react';
import { ClassroomsList } from '@/components/classrooms/classrooms-list';

export const metadata = { title: 'Classrooms · Nursery OS' };

export default function ClassroomsPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ClassroomsList />
    </Suspense>
  );
}
