'use client';

import type { Classroom } from '@nursery-os/contracts';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useClassroomDirectory, type ClassroomDirectoryResult } from '@/lib/classrooms/queries';

/**
 * Picks an existing classroom. Feature-specific, mirrors GuardianPicker/ChildPicker
 * from Task 12.3. Used by both Enrollment and Staff.
 *
 * `directory`: optional pre-fetched result. Pass this when the caller already
 * called useClassroomDirectory() itself for its own labels (e.g. StaffForm) -
 * skips this component's own fetch instead of duplicating the request.
 */
export function ClassroomPicker({
  excludeIds = [],
  onSelect,
  directory,
}: {
  excludeIds?: string[];
  onSelect: (classroom: Classroom) => void;
  directory?: ClassroomDirectoryResult;
}) {
  const ownDirectory = useClassroomDirectory(!directory);
  const { classrooms, isLoading, error, refetch } = directory ?? ownDirectory;
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
  const results = classrooms
    .filter((classroom) => !excluded.has(classroom.id))
    .filter((classroom) => query === '' || classroom.name.toLowerCase().includes(query));

  const columns: DataTableColumn<Classroom>[] = [
    { header: 'Name', cell: (classroom) => classroom.name },
    { header: 'Capacity', cell: (classroom) => classroom.capacity },
    {
      header: 'Actions',
      cell: (classroom) => (
        <Button variant="ghost" size="sm" onClick={() => onSelect(classroom)}>
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
        rowKey={(classroom) => classroom.id}
        isLoading={isLoading}
        emptyMessage={
          query
            ? 'No classrooms match your search.'
            : 'No classrooms available. Add one from the Classrooms page first.'
        }
      />
    </div>
  );
}
