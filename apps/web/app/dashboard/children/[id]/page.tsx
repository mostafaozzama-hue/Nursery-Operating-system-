import { ChildDetail } from '@/components/children/child-detail';

export const metadata = { title: 'Child · Nursery OS' };

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChildDetail childId={id} />;
}
