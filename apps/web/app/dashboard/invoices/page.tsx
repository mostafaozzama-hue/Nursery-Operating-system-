import { Suspense } from 'react';
import { InvoiceList } from '@/components/invoices/invoice-list';

export const metadata = { title: 'Invoices · Nursery OS' };

export default function InvoicesPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <InvoiceList />
    </Suspense>
  );
}
