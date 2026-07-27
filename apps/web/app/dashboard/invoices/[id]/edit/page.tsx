import { InvoiceEditForm } from '@/components/invoices/invoice-edit-form';

export const metadata = { title: 'Edit invoice · Nursery OS' };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceEditForm invoiceId={id} />;
}
