'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';
import { DEPOSIT_REFUND_POLICY_LABEL } from '@/lib/enrollment-billing-terms/mapper';
import { useEnrollmentBillingTerms } from '@/lib/enrollment-billing-terms/queries';
import { formatEnrollmentDate } from '@/lib/enrollments/mapper';
import { fullName } from '@/lib/guardians/mapper';
import { useGuardian } from '@/lib/guardians/queries';
import { formatMoney } from '@/lib/money';
import { usePlan } from '@/lib/plans/queries';
import { BillingTermsSheet } from './billing-terms-sheet';

/**
 * OWNER/ADMIN only - the backend's GET .../billing-terms is itself
 * OWNER/ADMIN-gated (same sensitivity class as StaffPayroll), stricter than
 * Enrollment's own read access, so this whole section must be hidden from
 * other roles entirely, not just its action button. Only rendered by
 * EnrollmentSection when canManage && a current enrollment exists.
 */
export function BillingTermsSection({
  enrollmentId,
  childId,
}: {
  enrollmentId: string;
  childId: string;
}) {
  const { data, isLoading, error, refetch } = useEnrollmentBillingTerms(enrollmentId);
  const { data: plan } = usePlan(data?.planId ?? null);
  const { data: guardian } = useGuardian(data?.billingGuardianId ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Billing Terms</h2>
        {!isLoading && !error && (
          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
            {data ? 'Change billing terms' : 'Set billing terms'}
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
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data ? (
        <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Plan</dt>
          <dd>{data.planId ? (plan?.name ?? '…') : 'No plan assigned'}</dd>
          <dt className="text-muted-foreground">Billing guardian</dt>
          <dd>{guardian ? fullName(guardian) : '…'}</dd>
          <dt className="text-muted-foreground">Custom rate</dt>
          <dd>
            {data.customRateAmount
              ? `${formatMoney(data.customRateAmount)} (${data.customRateReason})`
              : '—'}
          </dd>
          <dt className="text-muted-foreground">Deposit</dt>
          <dd>
            {data.depositAmount && data.depositRefundPolicy
              ? `${formatMoney(data.depositAmount)} · ${DEPOSIT_REFUND_POLICY_LABEL[data.depositRefundPolicy]}`
              : '—'}
          </dd>
          <dt className="text-muted-foreground">Withdrawal notice given</dt>
          <dd>
            {data.withdrawalNoticeGivenDate
              ? formatEnrollmentDate(data.withdrawalNoticeGivenDate)
              : '—'}
          </dd>
        </dl>
      ) : (
        <p className="text-sm">No billing terms set.</p>
      )}

      <BillingTermsSheet
        enrollmentId={enrollmentId}
        childId={childId}
        currentTerms={data}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDone={() => {
          setSheetOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
