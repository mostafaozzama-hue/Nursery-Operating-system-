'use client';

import type { EnrollmentBillingTerms } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isApiError } from '@/lib/api/errors';
import { useChangeBillingTerms } from '@/lib/enrollment-billing-terms/mutations';
import {
  changeBillingTermsFormSchema,
  emptyChangeBillingTermsFormValues,
  openBillingTermsFormSchema,
  toChangeBillingTermsRequest,
  toOpenBillingTermsRequest,
  type ChangeBillingTermsFormValues,
} from '@/lib/enrollment-billing-terms/schema';
import { BillingTermsFields } from './billing-terms-fields';

function fieldErrorsFrom(
  issues: z.ZodIssue[],
): Partial<Record<keyof ChangeBillingTermsFormValues, string>> {
  const errors: Partial<Record<keyof ChangeBillingTermsFormValues, string>> = {};
  for (const issue of issues) {
    errors[issue.path[0] as keyof ChangeBillingTermsFormValues] = issue.message;
  }
  return errors;
}

/**
 * Handles both business flows the backend's PATCH .../billing-terms now
 * explicitly dispatches between: setting billing terms for the first time
 * (currentTerms === null - billingGuardianId required, effectiveFrom has no
 * meaning for a first-time create so it's hidden here and silently defaulted
 * to today) and changing already-existing terms (effectiveFrom required and
 * must be future-dated, guardian optional - carries forward unless changed).
 * Sheet, not a new route or a second sheet - the action completes and
 * returns to Enrollment Section, no history/analytics shown here
 * (design-system.md §5.13, same as SetPlanPriceSheet's precedent).
 */
export function BillingTermsSheet({
  enrollmentId,
  childId,
  currentTerms,
  open,
  onOpenChange,
  onDone,
}: {
  enrollmentId: string;
  childId: string;
  currentTerms: EnrollmentBillingTerms | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const isCreate = currentTerms === null;
  const { mutate: changeBillingTerms, isPending, error: submitError } = useChangeBillingTerms();
  const [values, setValues] = useState<ChangeBillingTermsFormValues>(
    emptyChangeBillingTermsFormValues,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ChangeBillingTermsFormValues, string>>
  >({});

  useEffect(() => {
    if (open) {
      setValues({
        effectiveFrom: '',
        planId: currentTerms?.planId ?? '',
        billingGuardianId: currentTerms?.billingGuardianId ?? '',
        customRateAmount: currentTerms?.customRateAmount ?? '',
        customRateReason: currentTerms?.customRateReason ?? '',
        depositAmount: currentTerms?.depositAmount ?? '',
        depositRefundPolicy: currentTerms?.depositRefundPolicy ?? '',
        withdrawalNoticeGivenDate: currentTerms?.withdrawalNoticeGivenDate ?? '',
      });
      setFieldErrors({});
    }
  }, [open, currentTerms]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isCreate) {
      const result = openBillingTermsFormSchema.safeParse(values);
      if (!result.success) {
        setFieldErrors(fieldErrorsFrom(result.error.issues));
        return;
      }
      setFieldErrors({});
      const request = {
        ...toOpenBillingTermsRequest(result.data),
        effectiveFrom: new Date().toISOString().slice(0, 10),
      };
      try {
        await changeBillingTerms(enrollmentId, request);
        onDone();
      } catch {
        // surfaced via submitError below
      }
      return;
    }

    const result = changeBillingTermsFormSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(fieldErrorsFrom(result.error.issues));
      return;
    }
    setFieldErrors({});
    try {
      await changeBillingTerms(enrollmentId, toChangeBillingTermsRequest(result.data));
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isCreate ? 'Set billing terms' : 'Change billing terms'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          {!isCreate && (
            <>
              <p className="text-xs text-muted-foreground">
                Closes the current billing terms and opens a new segment from the effective date
                below. Must be dated in the future.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="effectiveFrom">Effective from</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={values.effectiveFrom}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, effectiveFrom: event.target.value }))
                  }
                />
                {fieldErrors.effectiveFrom && (
                  <p className="text-sm text-destructive">{fieldErrors.effectiveFrom}</p>
                )}
              </div>
            </>
          )}

          <BillingTermsFields
            childId={childId}
            values={values}
            onChange={(partial) => setValues((prev) => ({ ...prev, ...partial }))}
            fieldErrors={fieldErrors}
          />

          {submitError != null && (
            <p className="text-sm text-destructive">
              {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" size="touch" disabled={isPending}>
              {isPending ? 'Saving…' : isCreate ? 'Set billing terms' : 'Change billing terms'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
