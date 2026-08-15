import { Suspense } from 'react';
import { PayrollList } from '@/components/payroll/payroll-list';

export const metadata = { title: 'Payroll · Nursery OS' };

export default function PayrollPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PayrollList />
    </Suspense>
  );
}
