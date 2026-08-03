'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isApiError } from '@/lib/api/errors';
import { useSetSiblingDiscountTier } from '@/lib/sibling-discount-tiers/mutations';
import {
  emptySetSiblingDiscountTierFormValues,
  setSiblingDiscountTierFormSchema,
  toSetSiblingDiscountTierRequest,
  type SetSiblingDiscountTierFormValues,
} from '@/lib/sibling-discount-tiers/schema';

/** Mirrors SetPlanPriceSheet exactly, with the extra siblingCountThreshold field - flat resource, no parent id prop needed. */
export function SetSiblingDiscountTierSheet({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { mutate: setTier, isPending, error: submitError } = useSetSiblingDiscountTier();
  const [values, setValues] = useState<SetSiblingDiscountTierFormValues>(
    emptySetSiblingDiscountTierFormValues,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SetSiblingDiscountTierFormValues, string>>
  >({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = setSiblingDiscountTierFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof SetSiblingDiscountTierFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof SetSiblingDiscountTierFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await setTier(toSetSiblingDiscountTierRequest(result.data));
      setValues(emptySetSiblingDiscountTierFormValues);
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Set new tier</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <p className="text-xs text-muted-foreground">
            Closes the current tier period for this threshold and starts a new one from the
            effective date below. Past tier history is kept, not overwritten.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siblingCountThreshold">Sibling count threshold</Label>
            <Input
              id="siblingCountThreshold"
              type="number"
              min="1"
              step="1"
              value={values.siblingCountThreshold}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, siblingCountThreshold: event.target.value }))
              }
            />
            {fieldErrors.siblingCountThreshold && (
              <p className="text-sm text-destructive">{fieldErrors.siblingCountThreshold}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discountPercentage">Discount percentage</Label>
            <Input
              id="discountPercentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={values.discountPercentage}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, discountPercentage: event.target.value }))
              }
            />
            {fieldErrors.discountPercentage && (
              <p className="text-sm text-destructive">{fieldErrors.discountPercentage}</p>
            )}
          </div>

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

          {submitError != null && (
            <p className="text-sm text-destructive">
              {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" size="touch" disabled={isPending}>
              {isPending ? 'Saving…' : 'Set tier'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
