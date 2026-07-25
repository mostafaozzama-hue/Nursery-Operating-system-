'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { fullName } from '@/lib/guardians/mapper';
import { useDeleteGuardian } from '@/lib/guardians/mutations';
import { useGuardian } from '@/lib/guardians/queries';

export function GuardianDetail({ guardianId }: { guardianId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useGuardian(guardianId);
  const { mutate: deleteGuardian, isPending: isDeleting } = useDeleteGuardian();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteGuardian(guardianId);
      router.push('/dashboard/guardians');
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
        <dt className="text-muted-foreground">Phone</dt>
        <dd>{data.phone ?? '—'}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd>{data.email ?? '—'}</dd>
        {data.userId && (
          <>
            <dt className="text-muted-foreground">Linked user</dt>
            <dd className="font-mono text-xs">{data.userId}</dd>
          </>
        )}
      </dl>

      {canManage && (
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/guardians/${guardianId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete guardian"
        description={`Are you sure you want to delete ${fullName(data)}? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
