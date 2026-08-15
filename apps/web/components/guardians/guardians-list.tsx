'use client';

import type { Guardian } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { fullName } from '@/lib/guardians/mapper';
import { useDeleteGuardian } from '@/lib/guardians/mutations';
import { useGuardiansList } from '@/lib/guardians/queries';

export function GuardiansList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } =
    useGuardiansList();
  const { mutate: deleteGuardian, isPending: isDeleting } = useDeleteGuardian();
  const [pendingDelete, setPendingDelete] = useState<Guardian | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGuardian(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const columns: DataTableColumn<Guardian>[] = [
    {
      header: 'Name',
      cell: (guardian) => (
        <Link href={`/dashboard/guardians/${guardian.id}`} className="hover:underline">
          {fullName(guardian)}
        </Link>
      ),
    },
    { header: 'Phone', cell: (guardian) => guardian.phone ?? '—' },
    { header: 'Email', cell: (guardian) => guardian.email ?? '—' },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (guardian: Guardian) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/guardians/${guardian.id}/edit`}>Edit</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingDelete(guardian)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const isFiltered = Boolean(query.search || query.email);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search by name…"
            defaultValue={query.search}
            onChange={(event) => setQuery({ search: event.target.value })}
            className="max-w-xs"
          />
          <Input
            placeholder="Search by email…"
            defaultValue={query.email}
            onChange={(event) => setQuery({ email: event.target.value })}
            className="max-w-xs"
          />
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/dashboard/guardians/new">Add Guardian</Link>
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
          rowKey={(guardian) => guardian.id}
          isLoading={isLoading}
          emptyMessage={isFiltered ? 'No results match your search.' : 'No guardians found.'}
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
          title="Delete guardian"
          description={`Are you sure you want to delete ${fullName(pendingDelete)}? This cannot be undone.`}
          confirmLabel="Delete"
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
