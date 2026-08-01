import { FeeForm } from '@/components/configuration/fees/fee-form';

export const metadata = { title: 'Add Fee · Nursery OS' };

export default function NewFeePage() {
  return <FeeForm mode="create" />;
}
