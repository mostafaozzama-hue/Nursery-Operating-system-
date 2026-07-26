'use client';

import type { Staff } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useClassroomDirectory } from '@/lib/classrooms/queries';
import { formatHireDate, staffFullName } from '@/lib/staff/mapper';
import { useDeleteStaff } from '@/lib/staff/mutations';
import { useStaffList } from '@/lib/staff/queries';

export function StaffList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = useStaffList();
  const { byId: classroomsById, isLoading: classroomsLoading } = useClassroomDirectory();
  const { mutate: deleteStaff, isPending: isDeleting } = useDeleteStaff();
  const [pendingDelete, setPendingDelete] = useState<Staff | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteStaff(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const isLoadingAny = isLoading || classroomsLoading;

  const columns: DataTableColumn<Staff>[] = [
    {
      header: 'Staff',
      cell: (member) => (
        <Link href={`/dashboard/staff/${member.id}`} className="hover:underline">
          {staffFullName(member)}
        </Link>
      ),
    },
    { header: 'Position', cell: (member) => member.position ?? '—' },
    {
      header: 'Classroom',
      cell: (member) =>
        member.classroomId
          ? (classroomsById.get(member.classroomId)?.name ?? 'Unknown classroom')
          : '—',
    },
    {
      header: 'Hire date',
      cell: (member) => (member.hireDate ? formatHireDate(member.hireDate) : '—'),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (member: Staff) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/staff/${member.id}/edit`}>Edit</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingDelete(member)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const isFiltered = Boolean(query.search);
  const pendingDeleteLabel = pendingDelete ? staffFullName(pendingDelete) : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by name…"
          defaultValue={query.search}
          onChange={(event) => setQuery({ search: event.target.value })}
          className="max-w-xs"
        />
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/staff/new">Add Staff</Link>
          </Button>
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
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(member) => member.id}
          isLoading={isLoadingAny}
          emptyMessage={isFiltered ? 'No results match your search.' : 'No staff found.'}
        />
      )}

      <PaginationControls
        meta={{ total, page: query.page, pageSize: query.pageSize, totalPages }}
        onPageChange={(page) => setQuery({ page })}
      />

      {pendingDelete && (
        <ConfirmDialog
          open={pendingDelete !== null}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title="Remove staff record"
          description={`Are you sure you want to remove ${pendingDeleteLabel}? This cannot be undone.`}
          confirmLabel="Remove"
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
