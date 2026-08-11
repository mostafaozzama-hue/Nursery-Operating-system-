'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DiscountAssignmentsSection } from '@/components/child-discount-assignments/discount-assignments-section';
import { FeeAssignmentsSection } from '@/components/child-fee-assignments/fee-assignments-section';
import { LinkedGuardiansSection } from '@/components/child-guardians/linked-guardians-section';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EnrollmentSection } from '@/components/enrollments/enrollment-section';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { WaiversSection } from '@/components/waivers/waivers-section';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { formatDateOfBirth, fullName } from '@/lib/children/mapper';
import { useDeleteChild } from '@/lib/children/mutations';
import { useChild } from '@/lib/children/queries';

export function ChildDetail({ childId }: { childId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useChild(childId);
  const { mutate: deleteChild, isPending: isDeleting } = useDeleteChild();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useBreadcrumbLabel(childId, data ? fullName(data) : undefined);

  const handleConfirmDelete = async () => {
    try {
      await deleteChild(childId);
      router.push('/dashboard/children');
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  if (isLoading) {
    return <p>Loading…</p>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-destructive">
          {isApiError(error) ? error.message : 'Something went wrong.'}
        </p>
        <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{fullName(data)}</PageTitle>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Date of birth</dt>
        <dd>{formatDateOfBirth(data.dateOfBirth)}</dd>
        <dt className="text-muted-foreground">Gender</dt>
        <dd>{data.gender ?? '—'}</dd>
      </dl>

      {canManage && (
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/children/${childId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete child"
        description={`Are you sure you want to delete ${fullName(data)}? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <EnrollmentSection childId={childId} />
      <FeeAssignmentsSection childId={childId} />
      <DiscountAssignmentsSection childId={childId} />
      {canManage && <WaiversSection childId={childId} />}
      <LinkedGuardiansSection childId={childId} />
    </div>
  );
}
