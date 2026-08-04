import { BillingRunDetail } from '@/components/configuration/billing-runs/billing-run-detail';

export const metadata = { title: 'Billing Run · Nursery OS' };

export default async function BillingRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BillingRunDetail billingRunId={id} />;
}
