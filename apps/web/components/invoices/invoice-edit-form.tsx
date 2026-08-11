'use client';

import type { Child, Guardian } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChildPicker } from '@/components/child-guardians/child-picker';
import { GuardianPicker } from '@/components/child-guardians/guardian-picker';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { fullName as childFullName } from '@/lib/children/mapper';
import { useChildDirectory } from '@/lib/children/queries';
import { fullName as guardianFullName } from '@/lib/guardians/mapper';
import { useGuardianDirectory } from '@/lib/guardians/queries';
import { useUpdateInvoice } from '@/lib/invoices/mutations';
import { useInvoice } from '@/lib/invoices/queries';
import {
  emptyInvoiceFormValues,
  invoiceFormSchema,
  type InvoiceFormValues,
} from '@/lib/invoices/schema';

/** Correction only, matching UpdateInvoiceDto's restricted shape - DRAFT-only, enforced server-side, no line-item editing here (that's Invoice Detail). */
export function InvoiceEditForm({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const existing = useInvoice(invoiceId);
  const { mutate: updateInvoice, isPending, error: submitError } = useUpdateInvoice();
  const { byId: childrenById } = useChildDirectory();
  const { byId: guardiansById } = useGuardianDirectory();

  const breadcrumbChild = existing.data ? childrenById.get(existing.data.childId) : undefined;
  useBreadcrumbLabel(
    invoiceId,
    existing.data ? (breadcrumbChild ? childFullName(breadcrumbChild) : 'Invoice') : undefined,
  );

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

  useEffect(() => {
    if (existing.data) {
      setValues({ dueDate: existing.data.dueDate ?? '' });
      setChildId(existing.data.childId);
      setGuardianId(existing.data.billedToGuardianId);
    }
  }, [existing.data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = invoiceFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof InvoiceFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof InvoiceFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await updateInvoice(invoiceId, {
        childId: childId ?? undefined,
        billedToGuardianId: guardianId ?? undefined,
        dueDate: result.data.dueDate.trim() || undefined,
      });
      router.push(`/dashboard/invoices/${invoiceId}`);
    } catch {
      // surfaced via submitError below
    }
  };

  if (existing.isLoading) {
    return <p>Loading…</p>;
  }

  if (existing.error || !existing.data) {
    return (
      <p className="text-destructive">
        {isApiError(existing.error) ? existing.error.message : 'Something went wrong.'}
      </p>
    );
  }

  let childName: string | null = null;
  if (childId) {
    const child = selectedChild ?? childrenById.get(childId);
    childName = child ? childFullName(child) : 'Unknown child';
  }

  let guardianName: string | null = null;
  if (guardianId) {
    const guardian = selectedGuardian ?? guardiansById.get(guardianId);
    guardianName = guardian ? guardianFullName(guardian) : 'Unknown guardian';
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
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
            <p className="text-sm">{childName}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowChildPicker(true)}
            >
              Change
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
            <p className="text-sm">{guardianName}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGuardianPicker(true)}
            >
              Change
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dueDate">Due date</Label>
        <Input
          id="dueDate"
          type="date"
          value={values.dueDate}
          onChange={(event) => setValues((prev) => ({ ...prev, dueDate: event.target.value }))}
        />
        {fieldErrors.dueDate && <p className="text-sm text-destructive">{fieldErrors.dueDate}</p>}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
