import { Suspense } from 'react';
import { FeeList } from '@/components/configuration/fees/fee-list';

export const metadata = { title: 'Fees · Nursery OS' };

export default function FeesPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <FeeList />
    </Suspense>
  );
}
