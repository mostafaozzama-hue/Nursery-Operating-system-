import { StaffForm } from '@/components/staff/staff-form';

export const metadata = { title: 'Edit Staff · Nursery OS' };

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffForm mode="edit" staffId={id} />;
}
