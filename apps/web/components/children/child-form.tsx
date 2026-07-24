'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useCreateChild, useUpdateChild } from '@/lib/children/mutations';
import { useChild } from '@/lib/children/queries';
import {
  childFormSchema,
  emptyChildFormValues,
  toCreateChildRequest,
  type ChildFormValues,
} from '@/lib/children/schema';

type ChildFormProps = { mode: 'create' } | { mode: 'edit'; childId: string };

export function ChildForm(props: ChildFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const existing = useChild(isEdit ? props.childId : null);
  const { mutate: createChild, isPending: isCreating, error: createError } = useCreateChild();
  const { mutate: updateChild, isPending: isUpdating, error: updateError } = useUpdateChild();

  const [values, setValues] = useState<ChildFormValues>(emptyChildFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ChildFormValues, string>>>(
    {},
  );

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        firstName: existing.data.firstName,
        lastName: existing.data.lastName,
        dateOfBirth: existing.data.dateOfBirth.slice(0, 10),
        gender: existing.data.gender ?? '',
        photoUrl: existing.data.photoUrl ?? '',
      });
    }
  }, [isEdit, existing.data]);

  const setField =
    (field: keyof ChildFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = childFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof ChildFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof ChildFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const child =
        props.mode === 'edit'
          ? await updateChild(props.childId, toCreateChildRequest(result.data))
          : await createChild(toCreateChildRequest(result.data));
      router.push(`/dashboard/children/${child.id}`);
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
        <Label htmlFor="dateOfBirth">Date of birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={values.dateOfBirth}
          onChange={setField('dateOfBirth')}
        />
        {fieldErrors.dateOfBirth && (
          <p className="text-sm text-destructive">{fieldErrors.dateOfBirth}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gender">Gender</Label>
        <Input id="gender" autoComplete="off" value={values.gender} onChange={setField('gender')} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photoUrl">Photo URL</Label>
        <Input id="photoUrl" value={values.photoUrl} onChange={setField('photoUrl')} />
        {fieldErrors.photoUrl && <p className="text-sm text-destructive">{fieldErrors.photoUrl}</p>}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add child'}
      </Button>
    </form>
  );
}
