import { GuardianForm } from '@/components/guardians/guardian-form';

export const metadata = { title: 'Add Guardian · Nursery OS' };

export default function NewGuardianPage() {
  return <GuardianForm mode="create" />;
}
