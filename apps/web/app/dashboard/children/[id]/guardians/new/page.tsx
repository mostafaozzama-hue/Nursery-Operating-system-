import { LinkGuardianForm } from '@/components/child-guardians/link-guardian-form';

export const metadata = { title: 'Link Guardian · Nursery OS' };

export default async function NewChildGuardianLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LinkGuardianForm mode="create" childId={id} />;
}
