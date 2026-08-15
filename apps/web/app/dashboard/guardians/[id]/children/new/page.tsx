import { LinkChildForm } from '@/components/child-guardians/link-child-form';

export const metadata = { title: 'Link Child · Nursery OS' };

export default async function NewGuardianChildLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LinkChildForm mode="create" guardianId={id} />;
}
