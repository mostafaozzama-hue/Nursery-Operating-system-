import { InvoiceDetail } from '@/components/invoices/invoice-detail';

export const metadata = { title: 'Invoice · Nursery OS' };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetail invoiceId={id} />;
}
