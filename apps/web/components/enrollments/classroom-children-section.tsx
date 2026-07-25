'use client';

import type { Enrollment } from '@nursery-os/contracts';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { fullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';
import { useClassroomEnrollments } from '@/lib/enrollments/queries';

/** Read-only - assignment changes happen from the child's own Enrollment section, not here. */
export function ClassroomChildrenSection({ classroomId }: { classroomId: string }) {
  const {
    data: enrollments,
    isLoading: enrollmentsLoading,
    error: enrollmentsError,
    refetch,
  } = useClassroomEnrollments(classroomId);
  const { byId, isLoading: directoryLoading, error: directoryError } = useChildDirectory();

  const isLoading = enrollmentsLoading || directoryLoading;
  const error = enrollmentsError ?? directoryError;

  const columns: DataTableColumn<Enrollment>[] = [
    {
      header: 'Name',
      cell: (enrollment) => {
        const child = byId.get(enrollment.childId);
        return child ? (
          <Link href={`/dashboard/children/${child.id}`} className="hover:underline">
            {fullName(child)}
          </Link>
        ) : (
          <span className="text-muted-foreground">Unknown child</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Children in this classroom</h2>
      {error ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive">
            {isApiError(error) ? error.message : 'Something went wrong.'}
          </p>
          <Button variant="outline" size="sm" onClick={refetch} className="w-fit">
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={enrollments}
          rowKey={(enrollment) => enrollment.id}
          isLoading={isLoading}
          emptyMessage="No children currently assigned."
        />
      )}
    </div>
  );
}
