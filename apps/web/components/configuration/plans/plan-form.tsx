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
import { useCreatePlan, useUpdatePlan } from '@/lib/plans/mutations';
import {
  PLAN_BILLING_CYCLE_LABEL,
  PLAN_DAY_OF_WEEK_LABEL,
  toTimeInputValue,
} from '@/lib/plans/mapper';
import { usePlan } from '@/lib/plans/queries';
import {
  emptyPlanFormValues,
  planFormSchema,
  toCreatePlanRequest,
  toUpdatePlanRequest,
  type PlanFormValues,
} from '@/lib/plans/schema';
import {
  PLAN_BILLING_CYCLES,
  PLAN_DAYS_OF_WEEK,
  type PlanBillingCycle,
  type PlanDayOfWeek,
} from '@nursery-os/contracts';
import { cn } from '@/lib/utils';
import { ConfigurationSectionHeader } from '../configuration-section-header';

type PlanFormProps = { mode: 'create' } | { mode: 'edit'; planId: string };

/**
 * Shared create/edit, mirroring ClassroomForm's mode-discriminated-union
 * shape exactly. Both create and edit land on Plan Detail on success now
 * that it exists (Sprint 2) - previously redirected to Plans List as a
 * deliberately temporary shape before Plan Detail shipped.
 *
 * This outer component owns only the async-loading/error gate for edit mode - it deliberately does
 * NOT hold the form's `values` state itself. `PlanFormBody` below only ever mounts once the fetched
 * Plan (in edit mode) is already in hand, so its `useState` seeds directly from real data on its one
 * true first render. The previous shape (a single component whose `values` state started empty and
 * was patched via a `useEffect` once `existing.data` arrived) fed the Billing cycle Select a `value`
 * prop change on an already-mounted instance - the underlying Radix Select does not apply a value
 * update like that, and silently resets to empty instead (confirmed by instrumenting `onValueChange`
 * on the identical pattern in DiscountForm/FeeForm, which fires with `""` immediately after the
 * effect's `setValues` call - the bug is in the shared pattern, not anything entity-specific).
 * Gating on a separate component boundary means the Select is never mounted with anything but its
 * final, correct value - the same shape that already works correctly in create mode.
 */
export function PlanForm(props: PlanFormProps) {
  const isEdit = props.mode === 'edit';
  const existing = usePlan(isEdit ? props.planId : null);

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

  const initialValues: PlanFormValues =
    isEdit && existing.data
      ? {
          name: existing.data.name,
          billingCycle: existing.data.billingCycle,
          scheduleDaysOfWeek: existing.data.scheduleDaysOfWeek,
          scheduleStartTime: existing.data.scheduleStartTime
            ? toTimeInputValue(existing.data.scheduleStartTime)
            : '',
          scheduleEndTime: existing.data.scheduleEndTime
            ? toTimeInputValue(existing.data.scheduleEndTime)
            : '',
        }
      : emptyPlanFormValues;

  const initialShowScheduleWindow = Boolean(
    isEdit && existing.data && (existing.data.scheduleStartTime || existing.data.scheduleEndTime),
  );

  return (
    <PlanFormBody
      mode={props.mode}
      planId={isEdit ? props.planId : undefined}
      initialValues={initialValues}
      initialShowScheduleWindow={initialShowScheduleWindow}
    />
  );
}

function PlanFormBody({
  mode,
  planId,
  initialValues,
  initialShowScheduleWindow,
}: {
  mode: 'create' | 'edit';
  planId?: string;
  initialValues: PlanFormValues;
  initialShowScheduleWindow: boolean;
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const { mutate: createPlan, isPending: isCreating, error: createError } = useCreatePlan();
  const { mutate: updatePlan, isPending: isUpdating, error: updateError } = useUpdatePlan();

  const [values, setValues] = useState<PlanFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PlanFormValues, string>>>({});
  const [showScheduleWindow, setShowScheduleWindow] = useState(initialShowScheduleWindow);

  const toggleDay = (day: PlanDayOfWeek) => {
    setValues((prev) => ({
      ...prev,
      scheduleDaysOfWeek: prev.scheduleDaysOfWeek.includes(day)
        ? prev.scheduleDaysOfWeek.filter((d) => d !== day)
        : [...prev.scheduleDaysOfWeek, day],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = planFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof PlanFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof PlanFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      if (isEdit && planId) {
        await updatePlan(planId, toUpdatePlanRequest(result.data));
        router.push(`/dashboard/configuration/plans/${planId}`);
      } else {
        const plan = await createPlan(toCreatePlanRequest(result.data));
        router.push(`/dashboard/configuration/plans/${plan.id}`);
      }
    } catch {
      // surfaced via createError/updateError below
    }
  };

  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader title={isEdit ? 'Edit Plan' : 'Add Plan'} />

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
          <Label>Billing cycle</Label>
          <Select
            value={values.billingCycle || undefined}
            onValueChange={(value) =>
              setValues((prev) => ({ ...prev, billingCycle: value as PlanBillingCycle }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a billing cycle" />
            </SelectTrigger>
            <SelectContent>
              {PLAN_BILLING_CYCLES.map((cycle) => (
                <SelectItem key={cycle} value={cycle}>
                  {PLAN_BILLING_CYCLE_LABEL[cycle]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.billingCycle && (
            <p className="text-sm text-destructive">{fieldErrors.billingCycle}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Permitted attendance days</Label>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_DAYS_OF_WEEK.map((day) => {
              const selected = values.scheduleDaysOfWeek.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent text-foreground hover:bg-accent',
                  )}
                >
                  {PLAN_DAY_OF_WEEK_LABEL[day]}
                </button>
              );
            })}
          </div>
        </div>

        {!showScheduleWindow ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setShowScheduleWindow(true)}
          >
            More options (schedule window)
          </Button>
        ) : (
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="scheduleStartTime">Start time</Label>
              <Input
                id="scheduleStartTime"
                type="time"
                value={values.scheduleStartTime}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, scheduleStartTime: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="scheduleEndTime">End time</Label>
              <Input
                id="scheduleEndTime"
                type="time"
                value={values.scheduleEndTime}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, scheduleEndTime: event.target.value }))
                }
              />
            </div>
          </div>
        )}

        {submitError != null && (
          <p className="text-sm text-destructive">
            {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add Plan'}
        </Button>
      </form>
    </div>
  );
}
