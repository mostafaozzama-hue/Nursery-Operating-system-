'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useUpdateEnrollmentReason } from '@/lib/enrollments/mutations';
import { useEnrollment } from '@/lib/enrollments/queries';
import {
  editReasonFormSchema,
  emptyReasonFormValues,
  toUpdateEnrollmentRequest,
  type ReasonFormValues,
} from '@/lib/enrollments/schema';
import { cn } from '@/lib/utils';

export function EditReasonForm({
  childId,
  enrollmentId,
}: {
  childId: string;
  enrollmentId: string;
}) {
  const router = useRouter();
  const existing = useEnrollment(enrollmentId);
  const { mutate: updateReason, isPending, error: submitError } = useUpdateEnrollmentReason();

  const [values, setValues] = useState<ReasonFormValues>(emptyReasonFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReasonFormValues, string>>>(
    {},
  );

  useEffect(() => {
    if (existing.data) {
      setValues({ reason: existing.data.createdReason ?? '' });
    }
  }, [existing.data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = editReasonFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof ReasonFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof ReasonFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await updateReason(enrollmentId, toUpdateEnrollmentRequest(result.data));
      router.push(`/dashboard/children/${childId}`);
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

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit reason</h1>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Created reason</Label>
        <textarea
          id="reason"
          value={values.reason}
          onChange={(event) => setValues({ reason: event.target.value })}
          rows={3}
          className={cn(
            'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
          )}
        />
        {fieldErrors.reason && <p className="text-sm text-destructive">{fieldErrors.reason}</p>}
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
