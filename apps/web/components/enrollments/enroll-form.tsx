'use client';

import type { Classroom } from '@nursery-os/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClassroomPicker } from '@/components/classrooms/classroom-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { isApiError } from '@/lib/api/errors';
import { useCreateEnrollment } from '@/lib/enrollments/mutations';
import {
  emptyReasonFormValues,
  enrollFormSchema,
  toCreateEnrollmentRequest,
  type ReasonFormValues,
} from '@/lib/enrollments/schema';
import { cn } from '@/lib/utils';

export function EnrollForm({ childId }: { childId: string }) {
  const router = useRouter();
  const { mutate: createEnrollment, isPending, error: submitError } = useCreateEnrollment();

  const [stage, setStage] = useState<'pick' | 'reason'>('pick');
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [values, setValues] = useState<ReasonFormValues>(emptyReasonFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReasonFormValues, string>>>(
    {},
  );

  const proceedWithClassroom = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setStage('reason');
  };

  const proceedWithoutClassroom = () => {
    setSelectedClassroom(null);
    setStage('reason');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = enrollFormSchema.safeParse(values);
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
      await createEnrollment(
        toCreateEnrollmentRequest(childId, selectedClassroom?.id ?? null, result.data),
      );
      router.push(`/dashboard/children/${childId}`);
    } catch {
      // surfaced via submitError below
    }
  };

  if (stage === 'pick') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Enroll</h1>
        <Button variant="outline" size="sm" className="w-fit" onClick={proceedWithoutClassroom}>
          Waitlist without a classroom
        </Button>
        <ClassroomPicker onSelect={proceedWithClassroom} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Classroom</p>
        <p className="font-medium">
          {selectedClassroom ? selectedClassroom.name : 'Waitlisted (no classroom)'}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setStage('pick')}>
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
        {isPending ? 'Saving…' : 'Enroll'}
      </Button>
    </form>
  );
}
