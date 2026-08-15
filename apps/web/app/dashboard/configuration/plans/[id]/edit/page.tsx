import { PlanForm } from '@/components/configuration/plans/plan-form';

export const metadata = { title: 'Edit Plan · Nursery OS' };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanForm mode="edit" planId={id} />;
}
