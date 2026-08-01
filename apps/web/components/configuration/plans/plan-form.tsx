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
 * shape exactly. There is no Plan Detail page yet (later sprint) - both
 * create and edit land back on the Plans List on success, not a detail
 * page, since there's nowhere else to send the user yet. Revisit once
 * Plan Detail ships.
 */
export function PlanForm(props: PlanFormProps) {
  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const existing = usePlan(isEdit ? props.planId : null);
  const { mutate: createPlan, isPending: isCreating, error: createError } = useCreatePlan();
  const { mutate: updatePlan, isPending: isUpdating, error: updateError } = useUpdatePlan();

  const [values, setValues] = useState<PlanFormValues>(emptyPlanFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PlanFormValues, string>>>({});
  const [showScheduleWindow, setShowScheduleWindow] = useState(false);

  useEffect(() => {
    if (isEdit && existing.data) {
      setValues({
        name: existing.data.name,
        billingCycle: existing.data.billingCycle,
        scheduleDaysOfWeek: existing.data.scheduleDaysOfWeek,
        scheduleStartTime: existing.data.scheduleStartTime
          ? toTimeInputValue(existing.data.scheduleStartTime)
          : '',
        scheduleEndTime: existing.data.scheduleEndTime
          ? toTimeInputValue(existing.data.scheduleEndTime)
          : '',
      });
      if (existing.data.scheduleStartTime || existing.data.scheduleEndTime) {
        setShowScheduleWindow(true);
      }
    }
  }, [isEdit, existing.data]);

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
      if (props.mode === 'edit') {
        await updatePlan(props.planId, toUpdatePlanRequest(result.data));
      } else {
        await createPlan(toCreatePlanRequest(result.data));
      }
      router.push('/dashboard/configuration/plans');
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
