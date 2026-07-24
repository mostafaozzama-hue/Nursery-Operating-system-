import { ChildForm } from '@/components/children/child-form';

export const metadata = { title: 'Edit Child · Nursery OS' };

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChildForm mode="edit" childId={id} />;
}
