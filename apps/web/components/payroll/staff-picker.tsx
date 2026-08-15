'use client';

import type { Staff } from '@nursery-os/contracts';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { staffFullName } from '@/lib/staff/mapper';
import { useStaffDirectory, type StaffDirectoryResult } from '@/lib/staff/queries';

/**
 * Picks an existing staff member to attach a Payroll record to.
 * Feature-specific to Payroll, mirrors ClassroomPicker/MembershipPicker.
 *
 * `directory`: optional pre-fetched result, same purpose as those pickers' -
 * pass this when the caller already called useStaffDirectory() itself.
 */
export function StaffPicker({
  onSelect,
  directory,
}: {
  onSelect: (staff: Staff) => void;
  directory?: StaffDirectoryResult;
}) {
  const ownDirectory = useStaffDirectory(!directory);
  const { staff, isLoading, error, refetch } = directory ?? ownDirectory;
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

  const query = search.trim().toLowerCase();
  const results = staff.filter(
    (member) => query === '' || staffFullName(member).toLowerCase().includes(query),
  );

  const columns: DataTableColumn<Staff>[] = [
    { header: 'Name', cell: (member) => staffFullName(member) },
    { header: 'Position', cell: (member) => member.position ?? '—' },
    {
      header: 'Actions',
      cell: (member) => (
        <Button variant="ghost" size="sm" onClick={() => onSelect(member)}>
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
        rowKey={(member) => member.id}
        isLoading={isLoading}
        emptyMessage={
          query
            ? 'No staff match your search.'
            : 'No staff available. Add one from the Staff page first.'
        }
      />
    </div>
  );
}
