'use client';

import type { InvoiceLineItem } from '@nursery-os/contracts';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useRemoveLineItem, useUpdateLineItem } from '@/lib/invoices/mutations';
import { formatMoney } from '@/lib/money';
import { lineItemFormSchema, type LineItemFormValues } from '@/lib/invoices/schema';

/** One line item row - display, inline edit, and remove (ConfirmDialog-gated per rule 6). Editable only while the parent invoice is DRAFT and the caller is OWNER/ADMIN - both already checked by the caller before rendering `editable`. */
export function LineItemRow({
  invoiceId,
  lineItem,
  editable,
  onChanged,
}: {
  invoiceId: string;
  lineItem: InvoiceLineItem;
  editable: boolean;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [values, setValues] = useState<LineItemFormValues>({
    description: lineItem.description,
    quantity: lineItem.quantity,
    unitAmount: lineItem.unitAmount,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LineItemFormValues, string>>>(
    {},
  );

  const { mutate: updateLineItem, isPending: isUpdating, error: updateError } = useUpdateLineItem();
  const { mutate: removeLineItem, isPending: isRemoving } = useRemoveLineItem();

  const handleSave = async () => {
    const result = lineItemFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof LineItemFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof LineItemFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await updateLineItem(invoiceId, lineItem.id, {
        description: result.data.description.trim(),
        quantity: Number(result.data.quantity),
        unitAmount: Number(result.data.unitAmount),
      });
      setIsEditing(false);
      onChanged();
    } catch {
      // surfaced via updateError below
    }
  };

  const handleRemove = async () => {
    try {
      await removeLineItem(invoiceId, lineItem.id);
      setConfirmOpen(false);
      onChanged();
    } catch {
      // mutation hook captured the error; dialog stays open to retry/cancel
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-description-${lineItem.id}`}>Description</Label>
          <Input
            id={`edit-description-${lineItem.id}`}
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
            <Label htmlFor={`edit-quantity-${lineItem.id}`}>Quantity</Label>
            <Input
              id={`edit-quantity-${lineItem.id}`}
              value={values.quantity}
              onChange={(event) => setValues((prev) => ({ ...prev, quantity: event.target.value }))}
            />
            {fieldErrors.quantity && (
              <p className="text-sm text-destructive">{fieldErrors.quantity}</p>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`edit-unitAmount-${lineItem.id}`}>Unit amount</Label>
            <Input
              id={`edit-unitAmount-${lineItem.id}`}
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
        {updateError != null && (
          <p className="text-sm text-destructive">
            {isApiError(updateError) ? updateError.message : 'Something went wrong.'}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={isUpdating} onClick={handleSave}>
            {isUpdating ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{lineItem.description}</span>
        <span className="text-xs text-muted-foreground">
          {lineItem.quantity} × {formatMoney(lineItem.unitAmount)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{formatMoney(lineItem.totalAmount)}</span>
        {editable && (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
              Remove
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove line item"
        description={`Remove "${lineItem.description}" from this invoice?`}
        confirmLabel="Remove"
        isPending={isRemoving}
        onConfirm={handleRemove}
      />
    </div>
  );
}
