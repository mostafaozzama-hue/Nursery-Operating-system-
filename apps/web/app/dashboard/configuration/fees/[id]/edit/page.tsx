import { FeeForm } from '@/components/configuration/fees/fee-form';

export const metadata = { title: 'Edit Fee · Nursery OS' };

export default async function EditFeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FeeForm mode="edit" feeId={id} />;
}
