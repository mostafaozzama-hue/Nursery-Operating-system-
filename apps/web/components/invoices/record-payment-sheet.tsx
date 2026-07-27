'use client';

import { useState } from 'react';
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
import { PAYMENT_METHOD_LABEL } from '@/lib/invoices/mapper';
import { useRecordPayment } from '@/lib/invoices/mutations';
import {
  emptyRecordPaymentFormValues,
  recordPaymentFormSchema,
  toRecordPaymentRequest,
  type RecordPaymentFormValues,
} from '@/lib/invoices/schema';
import { PAYMENT_METHODS } from '@nursery-os/contracts';

/**
 * Sheet side="right" - the quick-create-from-a-detail-page pattern
 * design-system.md §5.13 names explicitly ("Add Guardian from within a
 * Child's linked-guardians section"), reused here for recording a payment
 * without leaving Invoice Detail.
 */
export function RecordPaymentSheet({
  invoiceId,
  open,
  onOpenChange,
  onDone,
}: {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { mutate: recordPayment, isPending, error: submitError } = useRecordPayment();
  const [values, setValues] = useState<RecordPaymentFormValues>(emptyRecordPaymentFormValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RecordPaymentFormValues, string>>
  >({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = recordPaymentFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof RecordPaymentFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof RecordPaymentFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await recordPayment(invoiceId, toRecordPaymentRequest(result.data));
      setValues(emptyRecordPaymentFormValues);
      onDone();
    } catch {
      // surfaced via submitError below
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              value={values.amount}
              onChange={(event) => setValues((prev) => ({ ...prev, amount: event.target.value }))}
            />
            {fieldErrors.amount && <p className="text-sm text-destructive">{fieldErrors.amount}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Payment method</Label>
            <Select
              value={values.paymentMethod}
              onValueChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  paymentMethod: value as typeof prev.paymentMethod,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABEL[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paidAt">Paid on</Label>
            <Input
              id="paidAt"
              type="date"
              value={values.paidAt}
              onChange={(event) => setValues((prev) => ({ ...prev, paidAt: event.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Leave blank for today.</p>
            {fieldErrors.paidAt && <p className="text-sm text-destructive">{fieldErrors.paidAt}</p>}
          </div>

          {submitError != null && (
            <p className="text-sm text-destructive">
              {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" size="touch" disabled={isPending}>
              {isPending ? 'Recording…' : 'Record payment'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
