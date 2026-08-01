import { Suspense } from 'react';
import { PlanList } from '@/components/configuration/plans/plan-list';

export const metadata = { title: 'Plans · Nursery OS' };

export default function PlansPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PlanList />
    </Suspense>
  );
}
