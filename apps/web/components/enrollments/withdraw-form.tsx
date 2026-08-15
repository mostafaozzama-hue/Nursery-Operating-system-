'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { fullName } from '@/lib/children/mapper';
import { useChild } from '@/lib/children/queries';
import { useWithdrawEnrollment } from '@/lib/enrollments/mutations';
import {
  emptyReasonFormValues,
  toWithdrawEnrollmentRequest,
  withdrawFormSchema,
  type ReasonFormValues,
} from '@/lib/enrollments/schema';
import { cn } from '@/lib/utils';

export function WithdrawForm({ childId, enrollmentId }: { childId: string; enrollmentId: string }) {
  const router = useRouter();
  // Resolves the breadcrumb's childId segment (ux-debt.md UXD-2) - the
  // registration Child Detail made for this same ID is torn down on unmount
  // the moment we navigate here, so this nested route re-fetches and
  // re-registers it itself rather than inheriting a stale/absent label.
  const child = useChild(childId);
  useBreadcrumbLabel(childId, child.data ? fullName(child.data) : undefined);
  const { mutate: withdrawEnrollment, isPending, error: submitError } = useWithdrawEnrollment();

  const [values, setValues] = useState<ReasonFormValues>(emptyReasonFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReasonFormValues, string>>>(
    {},
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = withdrawFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof ReasonFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof ReasonFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await withdrawEnrollment(enrollmentId, toWithdrawEnrollmentRequest(result.data));
      router.push(`/dashboard/children/${childId}`);
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Withdraw</h1>
      <p className="text-sm text-muted-foreground">
        This closes the child&apos;s current enrollment. This cannot be undone.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
        <textarea
          id="reason"
          value={values.reason}
          onChange={(event) => setValues({ reason: event.target.value })}
          rows={3}
          className={cn(
            'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
          )}
        />
        {fieldErrors.reason && <p className="text-sm text-destructive">{fieldErrors.reason}</p>}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? 'Withdrawing…' : 'Withdraw'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/children/${childId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
