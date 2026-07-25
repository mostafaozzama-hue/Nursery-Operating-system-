'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { useMembershipDirectory } from '@/lib/memberships/queries';
import { formatHireDate, staffIdentityLabel } from '@/lib/staff/mapper';
import { useDeleteStaff } from '@/lib/staff/mutations';
import { useStaffMember } from '@/lib/staff/queries';

export function StaffDetail({ staffId }: { staffId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useStaffMember(staffId);
  const { byId: classroomsById, isLoading: classroomsLoading } = useClassroomDirectory();
  // Gated behind canManage - GET /memberships 403s for STAFF, unlike every other domain read.
  const { byId: membershipsById, isLoading: membershipsLoading } =
    useMembershipDirectory(canManage);
  const { mutate: deleteStaff, isPending: isDeleting } = useDeleteStaff();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteStaff(staffId);
      router.push('/dashboard/staff');
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const isLoadingAny = isLoading || classroomsLoading || (canManage && membershipsLoading);

  if (isLoadingAny) {
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

  const membership = canManage && data.userId ? membershipsById.get(data.userId) : undefined;
  const identity = staffIdentityLabel(membership?.email, data.position);
  const classroomName = data.classroomId
    ? (classroomsById.get(data.classroomId)?.name ?? 'Unknown classroom')
    : null;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{identity}</PageTitle>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Position</dt>
        <dd>{data.position ?? '—'}</dd>
        <dt className="text-muted-foreground">Hire date</dt>
        <dd>{data.hireDate ? formatHireDate(data.hireDate) : '—'}</dd>
        <dt className="text-muted-foreground">Classroom</dt>
        <dd>
          {data.classroomId ? (
            <Link href={`/dashboard/classrooms/${data.classroomId}`} className="hover:underline">
              {classroomName}
            </Link>
          ) : (
            '—'
          )}
        </dd>
        {canManage && (
          <>
            <dt className="text-muted-foreground">Linked user</dt>
            <dd>{membership?.email ?? (data.userId ? 'Unknown user' : '—')}</dd>
            <dt className="text-muted-foreground">Membership status</dt>
            <dd>{membership?.status ?? '—'}</dd>
          </>
        )}
      </dl>

      {canManage && (
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/staff/${staffId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Remove
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove staff record"
        description={`Are you sure you want to remove ${identity}? This cannot be undone.`}
        confirmLabel="Remove"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
