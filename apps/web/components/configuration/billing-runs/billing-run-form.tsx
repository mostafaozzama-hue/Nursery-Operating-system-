'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth';
import { useCreateBillingRun } from '@/lib/billing-runs/mutations';
import {
  billingRunFormSchema,
  emptyBillingRunFormValues,
  toCreateBillingRunRequest,
  type BillingRunFormValues,
} from '@/lib/billing-runs/schema';
import { ConfigurationSectionHeader } from '../configuration-section-header';

/**
 * Create-only - a BillingRun is never edited, re-triggering the same period is itself the
 * idempotent "redo" action (POST /billing-runs again), not a separate edit flow. No preview of
 * "how many children are eligible" before submitting - no backend endpoint exists for that
 * (EnrollmentBillingTermsService.findChildrenWithEffectiveTermsForPeriod is composable-only, no
 * controller route) - confirmed during Sprint 6 planning, not a gap introduced here.
 */
export function BillingRunForm() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { mutate: createBillingRun, isPending, error: submitError } = useCreateBillingRun();

  const [values, setValues] = useState<BillingRunFormValues>(emptyBillingRunFormValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BillingRunFormValues, string>>
  >({});

  if (!canManage) {
    return <p className="text-muted-foreground">You don&apos;t have access to billing runs.</p>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = billingRunFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof BillingRunFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof BillingRunFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const billingRun = await createBillingRun(toCreateBillingRunRequest(result.data));
      router.push(`/dashboard/configuration/billing-runs/${billingRun.id}`);
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader title="Trigger billing run" />

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="periodStart">Period start</Label>
          <Input
            id="periodStart"
            type="date"
            value={values.periodStart}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, periodStart: event.target.value }))
            }
          />
          {fieldErrors.periodStart && (
            <p className="text-sm text-destructive">{fieldErrors.periodStart}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="periodEnd">Period end</Label>
          <Input
            id="periodEnd"
            type="date"
            value={values.periodEnd}
            onChange={(event) => setValues((prev) => ({ ...prev, periodEnd: event.target.value }))}
          />
          {fieldErrors.periodEnd && (
            <p className="text-sm text-destructive">{fieldErrors.periodEnd}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Generates or updates a draft invoice for every child with effective billing terms in this
          period. Re-running the same period never creates a duplicate run, and never changes an
          invoice that&apos;s already issued - but if this period already has a mix of issued and
          draft invoices, re-running will report &quot;Partial failure&quot; for the already-issued
          ones, since they can no longer be regenerated.
        </p>

        {submitError != null && (
          <p className="text-sm text-destructive">
            {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Running…' : 'Trigger billing run'}
        </Button>
      </form>
    </div>
  );
}
