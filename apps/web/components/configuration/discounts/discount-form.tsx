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
import { useCreateDiscount, useUpdateDiscount } from '@/lib/discounts/mutations';
import { DISCOUNT_SCOPE_LABEL, DISCOUNT_TYPE_LABEL } from '@/lib/discounts/mapper';
import { useDiscount } from '@/lib/discounts/queries';
import {
  emptyDiscountFormValues,
  discountFormSchema,
  toCreateDiscountRequest,
  toUpdateDiscountRequest,
  type DiscountFormValues,
} from '@/lib/discounts/schema';
import {
  DISCOUNT_SCOPES,
  DISCOUNT_TYPES,
  type DiscountScope,
  type DiscountType,
} from '@nursery-os/contracts';
import { ConfigurationSectionHeader } from '../configuration-section-header';

type DiscountFormProps = { mode: 'create' } | { mode: 'edit'; discountId: string };

/**
 * Shared create/edit, mirroring FeeForm's mode-discriminated-union shape exactly. There is no
 * Discount Detail page - both create and edit land back on the Discounts List on success.
 *
 * This outer component owns only the async-loading/error gate for edit mode - it deliberately does
 * NOT hold the form's `values` state itself. `DiscountFormBody` below only ever mounts once the
 * fetched Discount (in edit mode) is already in hand, so its `useState` seeds directly from real
 * data on its one true first render. The previous shape (a single component whose `values` state
 * started empty and was patched via a `useEffect` once `existing.data` arrived) fed each Select a
 * `value` prop change on an already-mounted instance - the underlying Radix Select does not apply a
 * value update like that, and silently resets to empty instead (confirmed by instrumenting
 * `onValueChange`, which fires with `""` immediately after the effect's `setValues` call). Gating
 * on a separate component boundary means the Select is never mounted with anything but its final,
 * correct value - the same shape that already works correctly in create mode.
 */
export function DiscountForm(props: DiscountFormProps) {
  const isEdit = props.mode === 'edit';
  const existing = useDiscount(isEdit ? props.discountId : null);

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

  const initialValues: DiscountFormValues =
    isEdit && existing.data
      ? {
          name: existing.data.name,
          type: existing.data.type,
          amount: existing.data.amount,
          stackable: existing.data.stackable,
          scope: existing.data.scope,
        }
      : emptyDiscountFormValues;

  return (
    <DiscountFormBody
      mode={props.mode}
      discountId={isEdit ? props.discountId : undefined}
      initialValues={initialValues}
    />
  );
}

function DiscountFormBody({
  mode,
  discountId,
  initialValues,
}: {
  mode: 'create' | 'edit';
  discountId?: string;
  initialValues: DiscountFormValues;
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const { mutate: createDiscount, isPending: isCreating, error: createError } = useCreateDiscount();
  const { mutate: updateDiscount, isPending: isUpdating, error: updateError } = useUpdateDiscount();

  const [values, setValues] = useState<DiscountFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DiscountFormValues, string>>>(
    {},
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = discountFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof DiscountFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof DiscountFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      if (isEdit && discountId) {
        await updateDiscount(discountId, toUpdateDiscountRequest(result.data));
      } else {
        await createDiscount(toCreateDiscountRequest(result.data));
      }
      router.push('/dashboard/configuration/discounts');
    } catch {
      // surfaced via createError/updateError below
    }
  };

  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader title={isEdit ? 'Edit Discount' : 'Add Discount'} />

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
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, type: value as DiscountType }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a discount type" />
            </SelectTrigger>
            <SelectContent>
              {DISCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {DISCOUNT_TYPE_LABEL[type]}
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

        <div className="flex flex-col gap-1.5">
          <Label>Stackable?</Label>
          <Select
            value={values.stackable ? 'true' : 'false'}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, stackable: value === 'true' }))
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

        <div className="flex flex-col gap-1.5">
          <Label>Scope</Label>
          <Select
            value={values.scope}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, scope: value as DiscountScope }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCOUNT_SCOPES.map((scope) => (
                <SelectItem key={scope} value={scope}>
                  {DISCOUNT_SCOPE_LABEL[scope]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.scope && <p className="text-sm text-destructive">{fieldErrors.scope}</p>}
        </div>

        {submitError != null && (
          <p className="text-sm text-destructive">
            {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add Discount'}
        </Button>
      </form>
    </div>
  );
}
