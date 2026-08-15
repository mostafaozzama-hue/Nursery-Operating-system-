'use client';

import type { Invoice } from '@nursery-os/contracts';
import { CHARGE_CATEGORIES, MANUAL_OVERRIDE_REASON_CODES } from '@nursery-os/contracts';
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
import {
  CHARGE_CATEGORY_LABEL,
  MANUAL_OVERRIDE_REASON_CODE_LABEL,
} from '@/lib/one-time-charges/mapper';
import { useAddOneTimeCharge } from '@/lib/one-time-charges/mutations';
import {
  emptyOneTimeChargeFormValues,
  oneTimeChargeFormSchema,
  oneTimeChargeOnNonDraftFormSchema,
  toAddOneTimeChargeRequest,
  type OneTimeChargeFormValues,
} from '@/lib/one-time-charges/schema';

function fieldErrorsFrom(
  issues: z.ZodIssue[],
): Partial<Record<keyof OneTimeChargeFormValues, string>> {
  const errors: Partial<Record<keyof OneTimeChargeFormValues, string>> = {};
  for (const issue of issues) {
    errors[issue.path[0] as keyof OneTimeChargeFormValues] = issue.message;
  }
  return errors;
}

/**
 * Works on a DRAFT or already-issued invoice alike - the entire reason OneTimeCharge exists as its
 * own entity rather than reusing the existing "Add line item" form on InvoiceDetail (which is
 * DRAFT-only, matching CreateLineItemDto's own scope). reasonCode becomes required once the invoice
 * is non-DRAFT: safe to validate client-side since the current Invoice is already in hand on this
 * page, unlike Waiver's merged-state rule this isn't a fresh server read. reasonNote-required-when-
 * OTHER stays a server-only rule, surfaced via submitError, same as Waiver's identical rule.
 */
export function OneTimeChargeSheet({
  invoice,
  open,
  onOpenChange,
  onDone,
}: {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const isDraft = invoice.status === 'DRAFT';
  const { mutate: addOneTimeCharge, isPending, error: submitError } = useAddOneTimeCharge();
  const [values, setValues] = useState<OneTimeChargeFormValues>(emptyOneTimeChargeFormValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof OneTimeChargeFormValues, string>>
  >({});

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(emptyOneTimeChargeFormValues);
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const schema = isDraft ? oneTimeChargeFormSchema : oneTimeChargeOnNonDraftFormSchema;
    const result = schema.safeParse(values);
    if (!result.success) {
      setFieldErrors(fieldErrorsFrom(result.error.issues));
      return;
    }
    setFieldErrors({});
    try {
      await addOneTimeCharge(invoice.id, toAddOneTimeChargeRequest(result.data));
      setValues(emptyOneTimeChargeFormValues);
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add charge</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chargeDescription">Description</Label>
            <Input
              id="chargeDescription"
              value={values.description}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            {fieldErrors.description && (
              <p className="text-sm text-destructive">{fieldErrors.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="chargeQuantity">Quantity</Label>
              <Input
                id="chargeQuantity"
                value={values.quantity}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, quantity: event.target.value }))
                }
              />
              {fieldErrors.quantity && (
                <p className="text-sm text-destructive">{fieldErrors.quantity}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="chargeUnitAmount">Unit amount</Label>
              <Input
                id="chargeUnitAmount"
                value={values.unitAmount}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, unitAmount: event.target.value }))
                }
              />
              {fieldErrors.unitAmount && (
                <p className="text-sm text-destructive">{fieldErrors.unitAmount}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={values.chargeCategory || undefined}
              onValueChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  chargeCategory: value as OneTimeChargeFormValues['chargeCategory'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {CHARGE_CATEGORY_LABEL[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.chargeCategory && (
              <p className="text-sm text-destructive">{fieldErrors.chargeCategory}</p>
            )}
          </div>

          {!isDraft && (
            <>
              <p className="text-xs text-muted-foreground">
                This invoice is no longer a draft - adding a charge here is recorded as a
                correction.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label>Reason</Label>
                <Select
                  value={values.reasonCode || undefined}
                  onValueChange={(value) => setValues((prev) => ({ ...prev, reasonCode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_OVERRIDE_REASON_CODES.map((reasonCode) => (
                      <SelectItem key={reasonCode} value={reasonCode}>
                        {MANUAL_OVERRIDE_REASON_CODE_LABEL[reasonCode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.reasonCode && (
                  <p className="text-sm text-destructive">{fieldErrors.reasonCode}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="chargeReasonNote">
                  Reason note{values.reasonCode === 'OTHER' ? '' : ' (optional)'}
                </Label>
                <Input
                  id="chargeReasonNote"
                  value={values.reasonNote}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, reasonNote: event.target.value }))
                  }
                />
              </div>
            </>
          )}

          {submitError != null && (
            <p className="text-sm text-destructive">
              {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" size="touch" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add charge'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
