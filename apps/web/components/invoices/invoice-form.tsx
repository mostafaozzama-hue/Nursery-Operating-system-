'use client';

import type { Child, Guardian } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChildPicker } from '@/components/child-guardians/child-picker';
import { GuardianPicker } from '@/components/child-guardians/guardian-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { fullName as childFullName } from '@/lib/children/mapper';
import { fullName as guardianFullName } from '@/lib/guardians/mapper';
import { useCreateInvoice } from '@/lib/invoices/mutations';
import {
  emptyInvoiceFormValues,
  emptyLineItemFormValues,
  invoiceFormSchema,
  lineItemFormSchema,
  toCreateInvoiceRequest,
  type InvoiceFormValues,
  type LineItemFormValues,
} from '@/lib/invoices/schema';

/**
 * Create-only - matches the backend's own split (POST /invoices accepts an
 * initial lineItems array; PATCH only allows childId/billedToGuardianId/
 * dueDate). Post-creation line-item add/edit/remove happens on Invoice
 * Detail, not here.
 */
export function InvoiceForm() {
  const router = useRouter();
  const { mutate: createInvoice, isPending, error: submitError } = useCreateInvoice();

  const [values, setValues] = useState<InvoiceFormValues>(emptyInvoiceFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof InvoiceFormValues, string>>>(
    {},
  );

  const [childId, setChildId] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showChildPicker, setShowChildPicker] = useState(false);

  const [guardianId, setGuardianId] = useState<string | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [showGuardianPicker, setShowGuardianPicker] = useState(false);

  const [lineItems, setLineItems] = useState<LineItemFormValues[]>([]);
  const [lineItemErrors, setLineItemErrors] = useState<
    Partial<Record<keyof LineItemFormValues, string>>[]
  >([]);
  const [entityError, setEntityError] = useState<string | null>(null);

  const updateLineItem = (index: number, partial: Partial<LineItemFormValues>) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...partial } : item)));
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
    setLineItemErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = invoiceFormSchema.safeParse(values);
    const errors: Partial<Record<keyof InvoiceFormValues, string>> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof InvoiceFormValues] = issue.message;
      }
    }
    setFieldErrors(errors);

    const lineResults = lineItems.map((item) => lineItemFormSchema.safeParse(item));
    const lineErrors = lineResults.map((r) => {
      const e: Partial<Record<keyof LineItemFormValues, string>> = {};
      if (!r.success) {
        for (const issue of r.error.issues) {
          e[issue.path[0] as keyof LineItemFormValues] = issue.message;
        }
      }
      return e;
    });
    setLineItemErrors(lineErrors);

    if (!childId || !guardianId) {
      setEntityError('Select a child and a billed-to guardian.');
      return;
    }
    setEntityError(null);

    if (!result.success || lineErrors.some((e) => Object.keys(e).length > 0)) {
      return;
    }

    try {
      const invoice = await createInvoice(
        toCreateInvoiceRequest(result.data, childId, guardianId, lineItems),
      );
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch {
      // surfaced via submitError below
    }
  };

  const childName = childId
    ? selectedChild
      ? childFullName(selectedChild)
      : 'Selected child'
    : null;
  const guardianName = guardianId
    ? selectedGuardian
      ? guardianFullName(selectedGuardian)
      : 'Selected guardian'
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Child</Label>
        {showChildPicker ? (
          <div className="flex flex-col gap-2">
            <ChildPicker
              excludeIds={[]}
              onSelect={(child) => {
                setSelectedChild(child);
                setChildId(child.id);
                setShowChildPicker(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowChildPicker(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm">{childName ?? 'Not selected'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowChildPicker(true)}
            >
              {childId ? 'Change' : 'Select'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Billed to (guardian)</Label>
        {showGuardianPicker ? (
          <div className="flex flex-col gap-2">
            <GuardianPicker
              excludeIds={[]}
              onSelect={(guardian) => {
                setSelectedGuardian(guardian);
                setGuardianId(guardian.id);
                setShowGuardianPicker(false);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setShowGuardianPicker(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm">{guardianName ?? 'Not selected'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGuardianPicker(true)}
            >
              {guardianId ? 'Change' : 'Select'}
            </Button>
          </div>
        )}
      </div>

      {entityError && <p className="text-sm text-destructive">{entityError}</p>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dueDate">Due date</Label>
        <Input
          id="dueDate"
          type="date"
          value={values.dueDate}
          onChange={(event) => setValues((prev) => ({ ...prev, dueDate: event.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Can also be set when the invoice is issued.</p>
        {fieldErrors.dueDate && <p className="text-sm text-destructive">{fieldErrors.dueDate}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Line items (optional here — can also be added after creating the draft)</Label>
        {lineItems.map((item, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`li-description-${index}`}>Description</Label>
              <Input
                id={`li-description-${index}`}
                value={item.description}
                onChange={(event) => updateLineItem(index, { description: event.target.value })}
              />
              {lineItemErrors[index]?.description && (
                <p className="text-sm text-destructive">{lineItemErrors[index].description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`li-quantity-${index}`}>Quantity</Label>
                <Input
                  id={`li-quantity-${index}`}
                  value={item.quantity}
                  onChange={(event) => updateLineItem(index, { quantity: event.target.value })}
                />
                {lineItemErrors[index]?.quantity && (
                  <p className="text-sm text-destructive">{lineItemErrors[index].quantity}</p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`li-unitAmount-${index}`}>Unit amount</Label>
                <Input
                  id={`li-unitAmount-${index}`}
                  value={item.unitAmount}
                  onChange={(event) => updateLineItem(index, { unitAmount: event.target.value })}
                />
                {lineItemErrors[index]?.unitAmount && (
                  <p className="text-sm text-destructive">{lineItemErrors[index].unitAmount}</p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => removeLineItem(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setLineItems((prev) => [...prev, { ...emptyLineItemFormValues }])}
        >
          Add line item
        </Button>
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating…' : 'Create invoice'}
      </Button>
    </form>
  );
}
