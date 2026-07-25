'use client';

import type { Membership } from '@nursery-os/contracts';
import { useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useMembershipDirectory, type MembershipDirectoryResult } from '@/lib/memberships/queries';

/**
 * Picks an existing active tenant member to link a Staff record to.
 * Feature-specific, first use case - no generic picker built, mirrors the
 * GuardianPicker/ChildPicker/ClassroomPicker precedent.
 *
 * Only ever rendered from OWNER/ADMIN-only forms (GET /memberships 403s for
 * STAFF, unlike every other domain list). `directory`: optional pre-fetched
 * result, same purpose as ClassroomPicker's - pass this when the caller
 * already called useMembershipDirectory() itself, to avoid a duplicate fetch.
 */
export function MembershipPicker({
  onSelect,
  directory,
}: {
  onSelect: (membership: Membership) => void;
  directory?: MembershipDirectoryResult;
}) {
  const ownDirectory = useMembershipDirectory(!directory);
  const { memberships, isLoading, error, refetch } = directory ?? ownDirectory;
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
  const results = memberships
    .filter((membership) => membership.status === 'ACTIVE')
    .filter((membership) => query === '' || membership.email.toLowerCase().includes(query));

  const columns: DataTableColumn<Membership>[] = [
    { header: 'Email', cell: (membership) => membership.email },
    { header: 'Role', cell: (membership) => membership.roleKey },
    {
      header: 'Actions',
      cell: (membership) => (
        <Button variant="ghost" size="sm" onClick={() => onSelect(membership)}>
          Select
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search by email…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs"
      />
      <DataTable
        columns={columns}
        rows={results}
        rowKey={(membership) => membership.userId}
        isLoading={isLoading}
        emptyMessage={
          query ? 'No active members match your search.' : 'No active members available to link.'
        }
      />
    </div>
  );
}
