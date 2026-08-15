'use client';

import type { Waiver } from '@nursery-os/contracts';
import { WAIVER_REASON_CODES, WAIVER_TYPES } from '@nursery-os/contracts';
import { useState } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isApiError } from '@/lib/api/errors';
import { WAIVER_REASON_CODE_LABEL, WAIVER_TYPE_LABEL } from '@/lib/waivers/mapper';
import { useCreateWaiver, useUpdateWaiver } from '@/lib/waivers/mutations';
import {
  createWaiverFormSchema,
  emptyWaiverFormValues,
  toCreateWaiverRequest,
  toUpdateWaiverRequest,
  updateWaiverFormSchema,
  type WaiverFormValues,
} from '@/lib/waivers/schema';

function fieldErrorsFrom(issues: z.ZodIssue[]): Partial<Record<keyof WaiverFormValues, string>> {
  const errors: Partial<Record<keyof WaiverFormValues, string>> = {};
  for (const issue of issues) {
    errors[issue.path[0] as keyof WaiverFormValues] = issue.message;
  }
  return errors;
}

/**
 * Mode-discriminated create/edit Sheet, mirroring BillingTermsSheet's shape. The outer component
 * stays mounted persistently (owns the Sheet's own open/close), while the inner Body is only
 * rendered while open and keyed by the target Waiver's id (or 'create') - forcing a fresh mount,
 * seeded directly from `target`, whenever the identity being edited changes. This is the Sprint 4
 * Select-init pattern adapted to a Sheet: `target` is already in hand synchronously here (the parent
 * Section's list query already fetched it), so there's no async gate to add - only the same
 * underlying guarantee that a Select's `value` is never patched onto an already-mounted instance.
 */
export function WaiverSheet({
  childId,
  target,
  open,
  onOpenChange,
  onDone,
}: {
  childId: string;
  target: Waiver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {open && (
          <WaiverSheetBody
            key={target?.id ?? 'create'}
            childId={childId}
            target={target}
            onDone={onDone}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function WaiverSheetBody({
  childId,
  target,
  onDone,
}: {
  childId: string;
  target: Waiver | null;
  onDone: () => void;
}) {
  const isEdit = target !== null;
  const { mutate: createWaiver, isPending: isCreating, error: createError } = useCreateWaiver();
  const { mutate: updateWaiver, isPending: isUpdating, error: updateError } = useUpdateWaiver();

  const [values, setValues] = useState<WaiverFormValues>(
    target
      ? {
          type: target.type,
          percentage: target.percentage,
          reasonCode: target.reasonCode,
          reasonNote: target.reasonNote ?? '',
          effectiveFrom: target.effectiveFrom,
          effectiveTo: target.effectiveTo ?? '',
          reviewAnnually: target.reviewAnnually,
        }
      : emptyWaiverFormValues,
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof WaiverFormValues, string>>>(
    {},
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isEdit && target) {
      const result = updateWaiverFormSchema.safeParse(values);
      if (!result.success) {
        setFieldErrors(fieldErrorsFrom(result.error.issues));
        return;
      }
      setFieldErrors({});
      try {
        await updateWaiver(childId, target.id, toUpdateWaiverRequest(result.data));
        onDone();
      } catch {
        // surfaced via submitError below
      }
      return;
    }

    const result = createWaiverFormSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(fieldErrorsFrom(result.error.issues));
      return;
    }
    setFieldErrors({});
    try {
      await createWaiver(childId, toCreateWaiverRequest(result.data));
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEdit ? 'Edit waiver' : 'Add waiver'}</SheetTitle>
      </SheetHeader>

      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4"
      >
        {isEdit ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{WAIVER_TYPE_LABEL[values.type]}</dd>
            <dt className="text-muted-foreground">Effective from</dt>
            <dd>{new Date(values.effectiveFrom).toLocaleDateString()}</dd>
          </dl>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={values.type || undefined}
                onValueChange={(value) =>
                  setValues((prev) => ({ ...prev, type: value as WaiverFormValues['type'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a waiver type" />
                </SelectTrigger>
                <SelectContent>
                  {WAIVER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {WAIVER_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.type && <p className="text-sm text-destructive">{fieldErrors.type}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="waiverEffectiveFrom">Effective from</Label>
              <Input
                id="waiverEffectiveFrom"
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="waiverPercentage">Percentage</Label>
          <Input
            id="waiverPercentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={values.percentage}
            onChange={(event) => setValues((prev) => ({ ...prev, percentage: event.target.value }))}
          />
          {fieldErrors.percentage && (
            <p className="text-sm text-destructive">{fieldErrors.percentage}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Reason</Label>
          <Select
            value={values.reasonCode || undefined}
            onValueChange={(value) =>
              setValues((prev) => ({
                ...prev,
                reasonCode: value as WaiverFormValues['reasonCode'],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {WAIVER_REASON_CODES.map((reasonCode) => (
                <SelectItem key={reasonCode} value={reasonCode}>
                  {WAIVER_REASON_CODE_LABEL[reasonCode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.reasonCode && (
            <p className="text-sm text-destructive">{fieldErrors.reasonCode}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="waiverReasonNote">
            Reason note{values.reasonCode === 'OTHER' ? '' : ' (optional)'}
          </Label>
          <Input
            id="waiverReasonNote"
            value={values.reasonNote}
            onChange={(event) => setValues((prev) => ({ ...prev, reasonNote: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="waiverEffectiveTo">
            Effective to{values.reviewAnnually ? ' (optional)' : ''}
          </Label>
          <Input
            id="waiverEffectiveTo"
            type="date"
            value={values.effectiveTo}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, effectiveTo: event.target.value }))
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Review annually?</Label>
          <Select
            value={values.reviewAnnually ? 'true' : 'false'}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, reviewAnnually: value === 'true' }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">No</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {submitError != null && (
          <p className="text-sm text-destructive">
            {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
          </p>
        )}

        <SheetFooter className="px-0">
          <Button type="submit" size="touch" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add waiver'}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}
