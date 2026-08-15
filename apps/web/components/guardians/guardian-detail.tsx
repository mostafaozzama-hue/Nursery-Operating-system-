'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LinkedChildrenSection } from '@/components/child-guardians/linked-children-section';
import { Card, CardHeader, CardTitle } from '@/components/common/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { PageTitle } from '@/components/layout/page-title';
import { RecordPaymentSheet } from '@/components/payments/record-payment-sheet';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { fullName } from '@/lib/guardians/mapper';
import { useDeleteGuardian } from '@/lib/guardians/mutations';
import { useGuardian } from '@/lib/guardians/queries';
import { formatMoney } from '@/lib/money';
import { useMembershipDirectory } from '@/lib/memberships/queries';
import { PAYMENT_METHOD_LABEL, formatPaymentDate } from '@/lib/payments/mapper';
import { useAvailableCredit, useGuardianPayments } from '@/lib/payments/queries';

export function GuardianDetail({ guardianId }: { guardianId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { data, isLoading, error, refetch } = useGuardian(guardianId);
  // Gated behind canManage - GET /memberships 403s for STAFF, same reasoning
  // as StaffDetail. Unlike StaffDetail, the "Linked user" row itself stays
  // visible to every role here (see the fallback below) - only the
  // membership lookup used to resolve it into an email is gated.
  const { byId: membershipsById, isLoading: membershipsLoading } =
    useMembershipDirectory(canManage);
  const { mutate: deleteGuardian, isPending: isDeleting } = useDeleteGuardian();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  // Both GET /guardians/:id/payments and GET /guardians/:id/credit are
  // unrestricted by @Roles - any authenticated tenant member, same as
  // POST .../payments itself (OWNER/ADMIN/STAFF) - no canManage gate needed
  // here, unlike the membership lookup above.
  const payments = useGuardianPayments(guardianId);
  const credit = useAvailableCredit(guardianId);

  useBreadcrumbLabel(guardianId, data ? fullName(data) : undefined);

  const handleConfirmDelete = async () => {
    try {
      await deleteGuardian(guardianId);
      router.push('/dashboard/guardians');
    } catch {
      // mutation hook already captured the error; dialog stays open for the user to retry or cancel
    }
  };

  if (isLoading || (canManage && membershipsLoading)) {
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

  // Never render the raw userId (product-principles.md #16 / ux-debt.md
  // UXD-1). OWNER/ADMIN resolve it via the membership directory, same
  // pattern as StaffDetail; "Unknown user" mirrors that same edge case (a
  // linked userId with no matching membership). A STAFF-role viewer can't
  // call GET /memberships at all (403), so no lookup is attempted for
  // them - "Portal access linked" is a neutral label, not an error state.
  const membership = canManage && data.userId ? membershipsById.get(data.userId) : undefined;
  const linkedUserLabel = canManage
    ? (membership?.email ?? 'Unknown user')
    : 'Portal access linked';

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>{fullName(data)}</PageTitle>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Phone</dt>
        <dd>{data.phone ?? '—'}</dd>
        <dt className="text-muted-foreground">Email</dt>
        <dd>{data.email ?? '—'}</dd>
        {data.userId && (
          <>
            <dt className="text-muted-foreground">Linked user</dt>
            <dd>{linkedUserLabel}</dd>
          </>
        )}
      </dl>

      {canManage && (
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/guardians/${guardianId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete guardian"
        description={`Are you sure you want to delete ${fullName(data)}? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <LinkedChildrenSection guardianId={guardianId} />

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <Button size="sm" onClick={() => setPaymentSheetOpen(true)}>
            Record payment
          </Button>
        </CardHeader>

        <dl className="mb-4 grid max-w-md grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Available credit</dt>
          <dd className="font-medium">
            {credit.error != null
              ? '—'
              : credit.isLoading
                ? '…'
                : credit.data !== null
                  ? formatMoney(credit.data)
                  : '—'}
          </dd>
        </dl>

        {(payments.error != null || credit.error != null) && (
          <p className="mb-2 text-sm text-destructive">
            {isApiError(payments.error)
              ? payments.error.message
              : isApiError(credit.error)
                ? credit.error.message
                : 'Something went wrong loading payment data.'}
          </p>
        )}

        {payments.error != null ? null : payments.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : payments.data.length === 0 ? (
          <EmptyState message="No payments recorded yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {payments.data.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{PAYMENT_METHOD_LABEL[payment.paymentMethod]}</span>
                <span className="text-muted-foreground">{formatPaymentDate(payment.paidAt)}</span>
                <span className="font-medium">{formatMoney(payment.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <RecordPaymentSheet
        guardianId={guardianId}
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        onDone={() => {
          setPaymentSheetOpen(false);
          payments.refetch();
          credit.refetch();
        }}
      />
    </div>
  );
}
