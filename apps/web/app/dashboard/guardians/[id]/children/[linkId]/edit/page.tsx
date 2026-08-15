import { LinkChildForm } from '@/components/child-guardians/link-child-form';

export const metadata = { title: 'Edit Child Link · Nursery OS' };

export default async function EditGuardianChildLinkPage({
  params,
}: {
  params: Promise<{ id: string; linkId: string }>;
}) {
  const { id, linkId } = await params;
  return <LinkChildForm mode="edit" guardianId={id} linkId={linkId} />;
}
