import { Suspense } from 'react';
import { ChildrenList } from '@/components/children/children-list';

export const metadata = { title: 'Children · Nursery OS' };

export default function ChildrenPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ChildrenList />
    </Suspense>
  );
}
