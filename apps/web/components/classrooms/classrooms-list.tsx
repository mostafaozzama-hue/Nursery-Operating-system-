'use client';

import type { Classroom } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useDeleteClassroom } from '@/lib/classrooms/mutations';
import { useClassroomsList } from '@/lib/classrooms/queries';

export function ClassroomsList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } =
    useClassroomsList();
  const { mutate: deleteClassroom, isPending: isDeleting } = useDeleteClassroom();
  const [pendingDelete, setPendingDelete] = useState<Classroom | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteClassroom(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<Classroom>[] = [
    {
      header: 'Name',
      cell: (classroom) => (
        <Link href={`/dashboard/classrooms/${classroom.id}`} className="hover:underline">
          {classroom.name}
        </Link>
      ),
    },
    { header: 'Capacity', cell: (classroom) => classroom.capacity },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (classroom: Classroom) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/classrooms/${classroom.id}/edit`}>Edit</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingDelete(classroom)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const isFiltered = Boolean(query.search);

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
            <Link href="/dashboard/classrooms/new">Add Classroom</Link>
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
          rowKey={(classroom) => classroom.id}
          isLoading={isLoading}
          emptyMessage={isFiltered ? 'No results match your search.' : 'No classrooms found.'}
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
          title="Delete classroom"
          description={`Are you sure you want to delete ${pendingDelete.name}? This cannot be undone.`}
          confirmLabel="Delete"
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
