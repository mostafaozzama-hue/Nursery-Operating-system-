'use client';

import type { Staff } from '@nursery-os/contracts';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useMembershipDirectory } from '@/lib/memberships/queries';
import { staffIdentityLabel } from '@/lib/staff/mapper';
import { useClassroomStaff } from '@/lib/staff/queries';

/** Read-only, mirrors ClassroomChildrenSection - assignment changes happen from the staff record's own edit form, not here. */
export function ClassroomStaffSection({ classroomId }: { classroomId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const {
    data: staffMembers,
    isLoading: staffLoading,
    error,
    refetch,
  } = useClassroomStaff(classroomId);
  // Gated behind canManage - GET /memberships 403s for STAFF, unlike every other domain read.
  const { byId: membershipsById, isLoading: membershipsLoading } =
    useMembershipDirectory(canManage);

  const isLoading = staffLoading || (canManage && membershipsLoading);

  const columns: DataTableColumn<Staff>[] = [
    {
      header: 'Name',
      cell: (member) => {
        const email =
          canManage && member.userId ? membershipsById.get(member.userId)?.email : undefined;
        return (
          <Link href={`/dashboard/staff/${member.id}`} className="hover:underline">
            {staffIdentityLabel(email, member.position)}
          </Link>
        );
      },
    },
    { header: 'Position', cell: (member) => member.position ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Staff in this classroom</h2>
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
          rows={staffMembers}
          rowKey={(member) => member.id}
          isLoading={isLoading}
          emptyMessage="No staff currently assigned."
        />
      )}
    </div>
  );
}
