'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { fullName } from '@/lib/guardians/mapper';
import { useCreateGuardian, useUpdateGuardian } from '@/lib/guardians/mutations';
import { useGuardian } from '@/lib/guardians/queries';
import {
  emptyGuardianFormValues,
  guardianFormSchema,
  toCreateGuardianRequest,
  type GuardianFormValues,
} from '@/lib/guardians/schema';

type GuardianFormProps = { mode: 'create' } | { mode: 'edit'; guardianId: string };

export function GuardianForm(props: GuardianFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const existing = useGuardian(isEdit ? props.guardianId : null);
  const { mutate: createGuardian, isPending: isCreating, error: createError } = useCreateGuardian();
  const { mutate: updateGuardian, isPending: isUpdating, error: updateError } = useUpdateGuardian();

  useBreadcrumbLabel(
    isEdit ? props.guardianId : undefined,
    existing.data ? fullName(existing.data) : undefined,
  );

  const [values, setValues] = useState<GuardianFormValues>(emptyGuardianFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GuardianFormValues, string>>>(
    {},
  );

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        firstName: existing.data.firstName,
        lastName: existing.data.lastName,
        phone: existing.data.phone ?? '',
        email: existing.data.email ?? '',
      });
    }
  }, [isEdit, existing.data]);

  const setField =
    (field: keyof GuardianFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = guardianFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof GuardianFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof GuardianFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const guardian =
        props.mode === 'edit'
          ? await updateGuardian(props.guardianId, toCreateGuardianRequest(result.data))
          : await createGuardian(toCreateGuardianRequest(result.data));
      router.push(`/dashboard/guardians/${guardian.id}`);
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
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" value={values.firstName} onChange={setField('firstName')} />
        {fieldErrors.firstName && (
          <p className="text-sm text-destructive">{fieldErrors.firstName}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" value={values.lastName} onChange={setField('lastName')} />
        {fieldErrors.lastName && <p className="text-sm text-destructive">{fieldErrors.lastName}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" autoComplete="off" value={values.phone} onChange={setField('phone')} />
        {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" autoComplete="off" value={values.email} onChange={setField('email')} />
        {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add guardian'}
      </Button>
    </form>
  );
}
