import { StaffDetail } from '@/components/staff/staff-detail';

export const metadata = { title: 'Staff · Nursery OS' };

export default async function StaffMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffDetail staffId={id} />;
}
