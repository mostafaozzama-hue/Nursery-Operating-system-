'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageTitle } from '@/components/layout/page-title';
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
import { usePayrollRecord } from '@/lib/payroll/queries';
import { staffFullName } from '@/lib/staff/mapper';
import { useStaffMember } from '@/lib/staff/queries';

/** OWNER/ADMIN only - GET /payroll/:id 403s for STAFF. canManage gates the fetches themselves, not just the UI. */
export function PayrollDetail({ payrollId }: { payrollId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = usePayrollRecord(canManage ? payrollId : null);
  const staffResult = useStaffMember(canManage ? (data?.staffId ?? null) : null);
  const { mutate: deletePayroll, isPending: isDeleting } = useDeletePayroll();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!canManage) {
    return <p className="text-muted-foreground">You don&apos;t have access to payroll records.</p>;
  }

  const handleConfirmDelete = async () => {
    try {
      await deletePayroll(payrollId);
      router.push('/dashboard/payroll');
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  if (isLoading || staffResult.isLoading) {
    return <p>Loading…</p>;
  }

  if (error || !data) {
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

  const staffName = staffResult.data ? staffFullName(staffResult.data) : 'Unknown staff';

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Payroll — {staffName}</PageTitle>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Staff</dt>
        <dd>
          <Link href={`/dashboard/staff/${data.staffId}`} className="hover:underline">
            {staffName}
          </Link>
        </dd>
        <dt className="text-muted-foreground">Pay type</dt>
        <dd>{formatPayType(data.payType)}</dd>
        <dt className="text-muted-foreground">Rate</dt>
        <dd>{formatPayRate(data.payRate, data.currency, data.payType)}</dd>
        <dt className="text-muted-foreground">Frequency</dt>
        <dd>{formatPayFrequency(data.payFrequency)}</dd>
        <dt className="text-muted-foreground">Effective date</dt>
        <dd>{formatEffectiveDate(data.effectiveDate)}</dd>
      </dl>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/dashboard/payroll/${payrollId}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Remove
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove payroll record"
        description={`Are you sure you want to remove the payroll record for ${staffName}? This cannot be undone.`}
        confirmLabel="Remove"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
