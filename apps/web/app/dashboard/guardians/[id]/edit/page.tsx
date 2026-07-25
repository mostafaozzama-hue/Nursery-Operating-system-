import { GuardianForm } from '@/components/guardians/guardian-form';

export const metadata = { title: 'Edit Guardian · Nursery OS' };

export default async function EditGuardianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuardianForm mode="edit" guardianId={id} />;
}
