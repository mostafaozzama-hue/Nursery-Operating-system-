import { Suspense } from 'react';
import { GuardiansList } from '@/components/guardians/guardians-list';

export const metadata = { title: 'Guardians · Nursery OS' };

export default function GuardiansPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <GuardiansList />
    </Suspense>
  );
}
