import { Suspense } from 'react';
import { BillingRunList } from '@/components/configuration/billing-runs/billing-run-list';

export const metadata = { title: 'Billing Runs · Nursery OS' };

export default function BillingRunsPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <BillingRunList />
    </Suspense>
  );
}
