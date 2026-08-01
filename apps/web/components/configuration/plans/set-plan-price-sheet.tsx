'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isApiError } from '@/lib/api/errors';
import { useSetPlanPrice } from '@/lib/plan-prices/mutations';
import {
  emptySetPlanPriceFormValues,
  setPlanPriceFormSchema,
  toSetPlanPriceRequest,
  type SetPlanPriceFormValues,
} from '@/lib/plan-prices/schema';

/** Sheet side="right" - the quick-create-from-a-detail-page pattern design-system.md §5.13 names explicitly, same as RecordPaymentSheet. Launched from Plan Detail's Plan Prices section. */
export function SetPlanPriceSheet({
  planId,
  open,
  onOpenChange,
  onDone,
}: {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { mutate: setPlanPrice, isPending, error: submitError } = useSetPlanPrice();
  const [values, setValues] = useState<SetPlanPriceFormValues>(emptySetPlanPriceFormValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SetPlanPriceFormValues, string>>
  >({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = setPlanPriceFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof SetPlanPriceFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof SetPlanPriceFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await setPlanPrice(planId, toSetPlanPriceRequest(result.data));
      setValues(emptySetPlanPriceFormValues);
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Set new price</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <p className="text-xs text-muted-foreground">
            Closes the current price period and starts a new one from the effective date below. Past
            price history is kept, not overwritten.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={values.amount}
              onChange={(event) => setValues((prev) => ({ ...prev, amount: event.target.value }))}
            />
            {fieldErrors.amount && <p className="text-sm text-destructive">{fieldErrors.amount}</p>}
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
              {isPending ? 'Saving…' : 'Set price'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
