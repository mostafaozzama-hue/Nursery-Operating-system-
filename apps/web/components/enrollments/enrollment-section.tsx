'use client';

import type { Enrollment } from '@nursery-os/contracts';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { enrollmentStatusLabel, formatEnrollmentDate } from '@/lib/enrollments/mapper';
import { useChildEnrollments } from '@/lib/enrollments/queries';
import { BillingTermsSection } from './billing-terms-section';

/**
 * Single component owning both the "current status" summary and the full
 * history table, so the two share one useChildEnrollments/useClassroomDirectory
 * fetch pair instead of each independently re-fetching the same data.
 */
export function EnrollmentSection({ childId }: { childId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const {
    data,
    current,
    isLoading: enrollmentsLoading,
    error: enrollmentsError,
    refetch,
  } = useChildEnrollments(childId);
  const { byId, isLoading: directoryLoading, error: directoryError } = useClassroomDirectory();

  const isLoading = enrollmentsLoading || directoryLoading;
  const error = enrollmentsError ?? directoryError;

  const classroomName = (classroomId: string | null) =>
    classroomId ? (byId.get(classroomId)?.name ?? 'Unknown classroom') : 'Waitlisted';

  const columns: DataTableColumn<Enrollment>[] = [
    { header: 'Classroom', cell: (enrollment) => classroomName(enrollment.classroomId) },
    { header: 'Status', cell: (enrollment) => enrollmentStatusLabel(enrollment.status) },
    { header: 'Start date', cell: (enrollment) => formatEnrollmentDate(enrollment.startDate) },
    {
      header: 'End date',
      cell: (enrollment) => (enrollment.endDate ? formatEnrollmentDate(enrollment.endDate) : '—'),
    },
    {
      header: 'Planned end date',
      cell: (enrollment) =>
        enrollment.plannedEndDate ? formatEnrollmentDate(enrollment.plannedEndDate) : '—',
    },
    { header: 'Created reason', cell: (enrollment) => enrollment.createdReason ?? '—' },
    { header: 'Ended reason', cell: (enrollment) => enrollment.endedReason ?? '—' },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (enrollment: Enrollment) => (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/children/${childId}/enrollment/${enrollment.id}/edit`}>
                  Edit reason
                </Link>
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Enrollment</h2>
        {canManage && !isLoading && !error && (
          <div className="flex gap-2">
            {current ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/children/${childId}/enrollment/${current.id}/transfer`}>
                    {current.classroomId ? 'Transfer classroom' : 'Assign classroom'}
                  </Link>
                </Button>
                <Button asChild variant="destructive" size="sm">
                  <Link href={`/dashboard/children/${childId}/enrollment/${current.id}/withdraw`}>
                    Withdraw
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href={`/dashboard/children/${childId}/enrollment/new`}>Enroll</Link>
              </Button>
            )}
          </div>
        )}
      </div>

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
        <>
          {!isLoading && (
            <p className="text-sm">
              {current
                ? current.classroomId
                  ? `Currently active - ${classroomName(current.classroomId)}.`
                  : 'Currently waitlisted, not yet assigned to a classroom.'
                : 'Not currently enrolled.'}
            </p>
          )}
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(enrollment) => enrollment.id}
            isLoading={isLoading}
            emptyMessage="No enrollment history yet."
          />
        </>
      )}

      {canManage && current && <BillingTermsSection enrollmentId={current.id} childId={childId} />}
    </div>
  );
}
