'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useCreateClassroom, useUpdateClassroom } from '@/lib/classrooms/mutations';
import { useClassroom } from '@/lib/classrooms/queries';
import {
  classroomFormSchema,
  emptyClassroomFormValues,
  toCreateClassroomRequest,
  type ClassroomFormValues,
} from '@/lib/classrooms/schema';

type ClassroomFormProps = { mode: 'create' } | { mode: 'edit'; classroomId: string };

export function ClassroomForm(props: ClassroomFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const existing = useClassroom(isEdit ? props.classroomId : null);
  const {
    mutate: createClassroom,
    isPending: isCreating,
    error: createError,
  } = useCreateClassroom();
  const {
    mutate: updateClassroom,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateClassroom();

  useBreadcrumbLabel(
    isEdit ? props.classroomId : undefined,
    existing.data ? existing.data.name : undefined,
  );

  const [values, setValues] = useState<ClassroomFormValues>(emptyClassroomFormValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ClassroomFormValues, string>>
  >({});

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        name: existing.data.name,
        capacity: String(existing.data.capacity),
      });
    }
  }, [isEdit, existing.data]);

  const setField =
    (field: keyof ClassroomFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = classroomFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof ClassroomFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof ClassroomFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const classroom =
        props.mode === 'edit'
          ? await updateClassroom(props.classroomId, toCreateClassroomRequest(result.data))
          : await createClassroom(toCreateClassroomRequest(result.data));
      router.push(`/dashboard/classrooms/${classroom.id}`);
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
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={values.name} onChange={setField('name')} />
        {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="capacity">Capacity</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          step={1}
          value={values.capacity}
          onChange={setField('capacity')}
        />
        {fieldErrors.capacity && <p className="text-sm text-destructive">{fieldErrors.capacity}</p>}
      </div>

      {submitError != null && (
        <p className="text-sm text-destructive">
          {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add classroom'}
      </Button>
    </form>
  );
}
