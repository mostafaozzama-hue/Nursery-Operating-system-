'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { ConfigurationSectionHeader } from '../configuration-section-header';

type FeeFormProps = { mode: 'create' } | { mode: 'edit'; feeId: string };

/** Shared create/edit, mirroring PlanForm's mode-discriminated-union shape exactly. There is no Fee Detail page - both create and edit land back on the Fees List on success. */
export function FeeForm(props: FeeFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const existing = useFee(isEdit ? props.feeId : null);
  const { mutate: createFee, isPending: isCreating, error: createError } = useCreateFee();
  const { mutate: updateFee, isPending: isUpdating, error: updateError } = useUpdateFee();

  const [values, setValues] = useState<FeeFormValues>(emptyFeeFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FeeFormValues, string>>>({});

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        name: existing.data.name,
        type: existing.data.type,
        amount: existing.data.amount,
      });
    }
  }, [isEdit, existing.data]);

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
      if (props.mode === 'edit') {
        await updateFee(props.feeId, toUpdateFeeRequest(result.data));
      } else {
        await createFee(toCreateFeeRequest(result.data));
      }
      router.push('/dashboard/configuration/fees');
    } catch {
      // surfaced via createError/updateError below
    }
  };

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
