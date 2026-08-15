'use client';

import type { StaffPayroll } from '@nursery-os/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { PaginationControls } from '@/components/common/pagination-controls';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import {
  formatEffectiveDate,
  formatPayFrequency,
  formatPayRate,
  formatPayType,
} from '@/lib/payroll/mapper';
import { useDeletePayroll } from '@/lib/payroll/mutations';
import { usePayrollList } from '@/lib/payroll/queries';
import { staffFullName } from '@/lib/staff/mapper';
import { useStaffDirectory } from '@/lib/staff/queries';

/**
 * OWNER/ADMIN only, for both read and write - GET /payroll 403s for STAFF,
 * unlike every other domain list. `canManage` gates the fetches themselves
 * (not just the UI), so STAFF triggers zero /payroll or /staff requests,
 * same standard as useMembershipDirectory's canManage gating.
 */
export function PayrollList() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, total, totalPages, query, isLoading, error, setQuery, refetch } =
    usePayrollList(canManage);
  const { byId: staffById, isLoading: staffLoading } = useStaffDirectory(canManage);
  const { mutate: deletePayroll, isPending: isDeleting } = useDeletePayroll();
  const [pendingDelete, setPendingDelete] = useState<StaffPayroll | null>(null);

  if (!canManage) {
    return <p className="text-muted-foreground">You don&apos;t have access to payroll records.</p>;
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deletePayroll(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  const staffNameFor = (record: StaffPayroll) => {
    const member = staffById.get(record.staffId);
    return member ? staffFullName(member) : 'Unknown staff';
  };

  const isLoadingAny = isLoading || staffLoading;

  const columns: DataTableColumn<StaffPayroll>[] = [
    {
      header: 'Staff',
      cell: (record) => (
        <Link href={`/dashboard/payroll/${record.id}`} className="hover:underline">
          {staffNameFor(record)}
        </Link>
      ),
    },
    { header: 'Pay type', cell: (record) => formatPayType(record.payType) },
    {
      header: 'Rate',
      cell: (record) => formatPayRate(record.payRate, record.currency, record.payType),
    },
    { header: 'Frequency', cell: (record) => formatPayFrequency(record.payFrequency) },
    { header: 'Effective', cell: (record) => formatEffectiveDate(record.effectiveDate) },
    {
      header: 'Actions',
      cell: (record) => (
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/payroll/${record.id}/edit`}>Edit</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPendingDelete(record)}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  const pendingDeleteLabel = pendingDelete ? staffNameFor(pendingDelete) : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/dashboard/payroll/new">Add Payroll Record</Link>
        </Button>
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
          rowKey={(record) => record.id}
          isLoading={isLoadingAny}
          emptyMessage="No payroll records found."
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
          title="Remove payroll record"
          description={`Are you sure you want to remove the payroll record for ${pendingDeleteLabel}? This cannot be undone.`}
          confirmLabel="Remove"
          isPending={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
