import { ChildForm } from '@/components/children/child-form';

export const metadata = { title: 'Add Child · Nursery OS' };

export default function NewChildPage() {
  return <ChildForm mode="create" />;
}
