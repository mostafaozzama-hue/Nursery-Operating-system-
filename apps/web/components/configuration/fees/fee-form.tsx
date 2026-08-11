'use client';

import { useRouter } from 'next/navigation';
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
import { isApiError } from '@/lib/api/errors';
import { useCreateFee, useUpdateFee } from '@/lib/fees/mutations';
import { FEE_TYPE_LABEL } from '@/lib/fees/mapper';
import { useFee } from '@/lib/fees/queries';
import {
  emptyFeeFormValues,
  feeFormSchema,
  toCreateFeeRequest,
  toUpdateFeeRequest,
  type FeeFormValues,
} from '@/lib/fees/schema';
import { FEE_TYPES, type FeeType } from '@nursery-os/contracts';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { ConfigurationSectionHeader } from '../configuration-section-header';

type FeeFormProps = { mode: 'create' } | { mode: 'edit'; feeId: string };

/**
 * Shared create/edit, mirroring PlanForm's mode-discriminated-union shape exactly. There is no Fee
 * Detail page - both create and edit land back on the Fees List on success.
 *
 * This outer component owns only the async-loading/error gate for edit mode - it deliberately does
 * NOT hold the form's `values` state itself. `FeeFormBody` below only ever mounts once the fetched
 * Fee (in edit mode) is already in hand, so its `useState` seeds directly from real data on its one
 * true first render. The previous shape (a single component whose `values` state started empty and
 * was patched via a `useEffect` once `existing.data` arrived) fed the Type Select a `value` prop
 * change on an already-mounted instance - the underlying Radix Select does not apply a value update
 * like that, and silently resets to empty instead (confirmed by instrumenting `onValueChange` on the
 * identical pattern in DiscountForm, which fires with `""` immediately after the effect's
 * `setValues` call - the bug is in the shared pattern, not anything Fee- or Discount-specific).
 * Gating on a separate component boundary means the Select is never mounted with anything but its
 * final, correct value - the same shape that already works correctly in create mode.
 */
export function FeeForm(props: FeeFormProps) {
  const isEdit = props.mode === 'edit';
  const existing = useFee(isEdit ? props.feeId : null);

  useBreadcrumbLabel(
    isEdit ? props.feeId : undefined,
    existing.data ? existing.data.name : undefined,
  );

  if (isEdit && existing.isLoading) {
    return <p>Loading…</p>;
  }

  if (isEdit && existing.error) {
    return (
      <p className="text-destructive">
        {isApiError(existing.error) ? existing.error.message : 'Something went wrong.'}
      </p>
    );
  }

  const initialValues: FeeFormValues =
    isEdit && existing.data
      ? {
          name: existing.data.name,
          type: existing.data.type,
          amount: existing.data.amount,
        }
      : emptyFeeFormValues;

  return (
    <FeeFormBody
      mode={props.mode}
      feeId={isEdit ? props.feeId : undefined}
      initialValues={initialValues}
    />
  );
}

function FeeFormBody({
  mode,
  feeId,
  initialValues,
}: {
  mode: 'create' | 'edit';
  feeId?: string;
  initialValues: FeeFormValues;
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const { mutate: createFee, isPending: isCreating, error: createError } = useCreateFee();
  const { mutate: updateFee, isPending: isUpdating, error: updateError } = useUpdateFee();

  const [values, setValues] = useState<FeeFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FeeFormValues, string>>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = feeFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof FeeFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof FeeFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      if (isEdit && feeId) {
        await updateFee(feeId, toUpdateFeeRequest(result.data));
      } else {
        await createFee(toCreateFeeRequest(result.data));
      }
      router.push('/dashboard/configuration/fees');
    } catch {
      // surfaced via createError/updateError below
    }
  };

  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader title={isEdit ? 'Edit Fee' : 'Add Fee'} />

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select
            value={values.type || undefined}
            onValueChange={(value) => setValues((prev) => ({ ...prev, type: value as FeeType }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a fee type" />
            </SelectTrigger>
            <SelectContent>
              {FEE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {FEE_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.type && <p className="text-sm text-destructive">{fieldErrors.type}</p>}
        </div>

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

        {submitError != null && (
          <p className="text-sm text-destructive">
            {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add Fee'}
        </Button>
      </form>
    </div>
  );
}
