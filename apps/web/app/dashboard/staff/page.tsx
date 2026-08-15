import { Suspense } from 'react';
import { StaffList } from '@/components/staff/staff-list';

export const metadata = { title: 'Staff · Nursery OS' };

export default function StaffPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <StaffList />
    </Suspense>
  );
}
