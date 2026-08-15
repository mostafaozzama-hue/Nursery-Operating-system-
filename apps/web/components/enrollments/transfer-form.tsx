'use client';

import type { Classroom } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClassroomPicker } from '@/components/classrooms/classroom-picker';
import { useBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { fullName } from '@/lib/children/mapper';
import { useChild } from '@/lib/children/queries';
import { useTransferEnrollment } from '@/lib/enrollments/mutations';
import { useEnrollment } from '@/lib/enrollments/queries';
import {
  emptyReasonFormValues,
  toTransferEnrollmentRequest,
  transferFormSchema,
  type ReasonFormValues,
} from '@/lib/enrollments/schema';
import { cn } from '@/lib/utils';

export function TransferForm({ childId, enrollmentId }: { childId: string; enrollmentId: string }) {
  const router = useRouter();
  const existing = useEnrollment(enrollmentId);
  // Resolves the breadcrumb's childId segment (ux-debt.md UXD-2) - the
  // registration Child Detail made for this same ID is torn down on unmount
  // the moment we navigate here, so this nested route re-fetches and
  // re-registers it itself rather than inheriting a stale/absent label.
  const child = useChild(childId);
  useBreadcrumbLabel(childId, child.data ? fullName(child.data) : undefined);
  const { mutate: transferEnrollment, isPending, error: submitError } = useTransferEnrollment();

  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [values, setValues] = useState<ReasonFormValues>(emptyReasonFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReasonFormValues, string>>>(
    {},
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClassroom) return;
    const result = transferFormSchema.safeParse(values);
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
      await transferEnrollment(
        enrollmentId,
        toTransferEnrollmentRequest(selectedClassroom.id, result.data),
      );
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

  if (!selectedClassroom) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          {existing.data.classroomId ? 'Transfer classroom' : 'Assign classroom'}
        </h1>
        <ClassroomPicker
          excludeIds={existing.data.classroomId ? [existing.data.classroomId] : []}
          onSelect={setSelectedClassroom}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">New classroom</p>
        <p className="font-medium">{selectedClassroom.name}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClassroom(null)}>
          Change
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
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
        {isPending ? 'Saving…' : 'Confirm'}
      </Button>
    </form>
  );
}
