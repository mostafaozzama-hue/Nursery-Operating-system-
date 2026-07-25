'use client';

import type { Child } from '@nursery-os/contracts';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useChildDirectory } from '@/lib/children/queries';
import { fullName } from '@/lib/children/mapper';

/** Picks an existing child to link. Feature-specific by design - see GuardianPicker for the mirror. */
export function ChildPicker({
  excludeIds,
  onSelect,
}: {
  excludeIds: string[];
  onSelect: (child: Child) => void;
}) {
  const { children, isLoading, error, refetch } = useChildDirectory();
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
  const results = children
    .filter((child) => !excluded.has(child.id))
    .filter((child) => query === '' || fullName(child).toLowerCase().includes(query));

  const columns: DataTableColumn<Child>[] = [
    { header: 'Name', cell: (child) => fullName(child) },
    {
      header: 'Actions',
      cell: (child) => (
        <Button variant="ghost" size="sm" onClick={() => onSelect(child)}>
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
        rowKey={(child) => child.id}
        isLoading={isLoading}
        emptyMessage={
          query
            ? 'No children match your search.'
            : 'No children available to link. Add one from the Children page first.'
        }
      />
    </div>
  );
}
