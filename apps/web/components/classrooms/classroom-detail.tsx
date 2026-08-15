'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ClassroomChildrenSection } from '@/components/enrollments/classroom-children-section';
import { ClassroomStaffSection } from '@/components/staff/classroom-staff-section';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { PageTitle } from '@/components/layout/page-title';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useDeleteClassroom } from '@/lib/classrooms/mutations';
import { useClassroom } from '@/lib/classrooms/queries';

export function ClassroomDetail({ classroomId }: { classroomId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useClassroom(classroomId);
  const { mutate: deleteClassroom, isPending: isDeleting } = useDeleteClassroom();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useBreadcrumbLabel(classroomId, data ? data.name : undefined);

  const handleConfirmDelete = async () => {
    try {
      await deleteClassroom(classroomId);
      router.push('/dashboard/classrooms');
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
      <PageTitle>{data.name}</PageTitle>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Capacity</dt>
        <dd>{data.capacity}</dd>
      </dl>

      {canManage && (
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/classrooms/${classroomId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete classroom"
        description={`Are you sure you want to delete ${data.name}? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <ClassroomChildrenSection classroomId={classroomId} />
      <ClassroomStaffSection classroomId={classroomId} />
    </div>
  );
}
