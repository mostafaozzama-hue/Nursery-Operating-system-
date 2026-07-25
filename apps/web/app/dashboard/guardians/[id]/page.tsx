import { GuardianDetail } from '@/components/guardians/guardian-detail';

export const metadata = { title: 'Guardian · Nursery OS' };

export default async function GuardianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GuardianDetail guardianId={id} />;
}
