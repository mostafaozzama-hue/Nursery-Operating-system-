import { LinkGuardianForm } from '@/components/child-guardians/link-guardian-form';

export const metadata = { title: 'Edit Guardian Link · Nursery OS' };

export default async function EditChildGuardianLinkPage({
  params,
}: {
  params: Promise<{ id: string; linkId: string }>;
}) {
  const { id, linkId } = await params;
  return <LinkGuardianForm mode="edit" childId={id} linkId={linkId} />;
}
