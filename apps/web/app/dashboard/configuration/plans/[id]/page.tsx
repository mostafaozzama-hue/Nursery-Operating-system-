import { PlanDetail } from '@/components/configuration/plans/plan-detail';

export const metadata = { title: 'Plan · Nursery OS' };

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanDetail planId={id} />;
}
