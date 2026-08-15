import { PlanForm } from '@/components/configuration/plans/plan-form';

export const metadata = { title: 'Add Plan · Nursery OS' };

export default function NewPlanPage() {
  return <PlanForm mode="create" />;
}
