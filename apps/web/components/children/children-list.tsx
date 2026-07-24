'use client';

import type { Child } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { formatDateOfBirth, fullName } from '@/lib/children/mapper';
import { useDeleteChild } from '@/lib/children/mutations';
import { useChildrenList } from '@/lib/children/queries';

export function ChildrenList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } = useChildrenList();
  const { mutate: deleteChild, isPending: isDeleting } = useDeleteChild();
  const [pendingDelete, setPendingDelete] = useState<Child | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteChild(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<Child>[] = [
    {
      header: 'Name',
      cell: (child) => (
        <Link href={`/dashboard/children/${child.id}`} className="hover:underline">
          {fullName(child)}
        </Link>
      ),
    },
    { header: 'Date of birth', cell: (child) => formatDateOfBirth(child.dateOfBirth) },
    { header: 'Gender', cell: (child) => child.gender ?? '—' },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (child: Child) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/children/${child.id}/edit`}>Edit</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingDelete(child)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

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
            <Link href="/dashboard/children/new">Add Child</Link>
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
          rowKey={(child) => child.id}
          isLoading={isLoading}
          emptyMessage={query.search ? 'No results match your search.' : 'No children found.'}
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
          title="Delete child"
          description={`Are you sure you want to delete ${fullName(pendingDelete)}? This cannot be undone.`}
          confirmLabel="Delete"
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
