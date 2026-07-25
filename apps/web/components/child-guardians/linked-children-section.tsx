'use client';

import type { ChildGuardian } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { relationshipTypeLabel } from '@/lib/child-guardians/mapper';
import { useUnlinkGuardian } from '@/lib/child-guardians/mutations';
import { useGuardianChildren } from '@/lib/child-guardians/queries';
import { fullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';

export function LinkedChildrenSection({ guardianId }: { guardianId: string }) {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const {
    data: links,
    isLoading: linksLoading,
    error: linksError,
    refetch,
  } = useGuardianChildren(guardianId);
  const { byId, isLoading: directoryLoading, error: directoryError } = useChildDirectory();
  const { mutate: unlinkGuardian, isPending: isUnlinking } = useUnlinkGuardian();
  const [pendingUnlink, setPendingUnlink] = useState<ChildGuardian | null>(null);

  const handleConfirmUnlink = async () => {
    if (!pendingUnlink) return;
    try {
      await unlinkGuardian(pendingUnlink.id);
      setPendingUnlink(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const error = linksError ?? directoryError;
  const isLoading = linksLoading || directoryLoading;

  const columns: DataTableColumn<ChildGuardian>[] = [
    {
      header: 'Name',
      cell: (link) => {
        const child = byId.get(link.childId);
        return child ? (
          <Link href={`/dashboard/children/${child.id}`} className="hover:underline">
            {fullName(child)}
          </Link>
        ) : (
          <span className="text-muted-foreground">Unknown child</span>
        );
      },
    },
    { header: 'Relationship', cell: (link) => relationshipTypeLabel(link.relationshipType) },
    { header: 'Primary contact', cell: (link) => (link.isPrimaryContact ? 'Yes' : 'No') },
    { header: 'Emergency contact', cell: (link) => (link.isEmergencyContact ? 'Yes' : 'No') },
    { header: 'Can pick up', cell: (link) => (link.canPickup ? 'Yes' : 'No') },
    ...(canManage
      ? [
          {
            header: 'Actions',
            cell: (link: ChildGuardian) => (
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/guardians/${guardianId}/children/${link.id}/edit`}>
                    Edit
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingUnlink(link)}>
                  Unlink
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const pendingUnlinkChildName = pendingUnlink
    ? ((byId.get(pendingUnlink.childId) && fullName(byId.get(pendingUnlink.childId)!)) ??
      'this child')
    : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Children</h2>
        {canManage && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/guardians/${guardianId}/children/new`}>Link child</Link>
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
          rows={links}
          rowKey={(link) => link.id}
          isLoading={isLoading}
          emptyMessage="No children linked yet."
        />
      )}

      {pendingUnlink && (
        <ConfirmDialog
          open={pendingUnlink !== null}
          onOpenChange={(open) => !open && setPendingUnlink(null)}
          title="Unlink child"
          description={`Are you sure you want to unlink ${pendingUnlinkChildName} from this guardian? This cannot be undone.`}
          confirmLabel="Unlink"
          isPending={isUnlinking}
          onConfirm={handleConfirmUnlink}
        />
      )}
    </div>
  );
}
