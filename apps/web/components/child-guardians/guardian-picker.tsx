'use client';

import type { Guardian } from '@nursery-os/contracts';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { fullName } from '@/lib/guardians/mapper';
import { useGuardianDirectory } from '@/lib/guardians/queries';

/** Picks an existing guardian to link. Feature-specific by design - see ChildPicker for the mirror. */
export function GuardianPicker({
  excludeIds,
  onSelect,
}: {
  excludeIds: string[];
  onSelect: (guardian: Guardian) => void;
}) {
  const { guardians, isLoading, error, refetch } = useGuardianDirectory();
  const [search, setSearch] = useState('');

  if (error) {
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

  const excluded = new Set(excludeIds);
  const query = search.trim().toLowerCase();
  const results = guardians
    .filter((guardian) => !excluded.has(guardian.id))
    .filter((guardian) => query === '' || fullName(guardian).toLowerCase().includes(query));

  const columns: DataTableColumn<Guardian>[] = [
    { header: 'Name', cell: (guardian) => fullName(guardian) },
    { header: 'Phone', cell: (guardian) => guardian.phone ?? '—' },
    { header: 'Email', cell: (guardian) => guardian.email ?? '—' },
    {
      header: 'Actions',
      cell: (guardian) => (
        <Button variant="ghost" size="sm" onClick={() => onSelect(guardian)}>
          Select
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search by name…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs"
      />
      <DataTable
        columns={columns}
        rows={results}
        rowKey={(guardian) => guardian.id}
        isLoading={isLoading}
        emptyMessage={
          query
            ? 'No guardians match your search.'
            : 'No guardians available to link. Add one from the Guardians page first.'
        }
      />
    </div>
  );
}
