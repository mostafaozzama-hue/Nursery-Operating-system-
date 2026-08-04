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
import { useCreateHoliday, useUpdateHoliday } from '@/lib/holidays/mutations';
import { HOLIDAY_TYPE_LABEL, toTimeInputValue } from '@/lib/holidays/mapper';
import { useHoliday } from '@/lib/holidays/queries';
import {
  emptyHolidayFormValues,
  holidayFormSchema,
  toCreateHolidayRequest,
  toUpdateHolidayRequest,
  type HolidayFormValues,
} from '@/lib/holidays/schema';
import { HOLIDAY_TYPES, type HolidayType } from '@nursery-os/contracts';
import { ConfigurationSectionHeader } from '../configuration-section-header';

type HolidayFormProps = { mode: 'create' } | { mode: 'edit'; holidayId: string };

/**
 * Shared create/edit, mirroring DiscountForm's mode-discriminated-union shape exactly. There is no
 * Holiday Detail page - both create and edit land back on the Holidays List on success.
 *
 * Same outer-gate/inner-body split Sprint 4 fixed FeeForm/DiscountForm/PlanForm with: the outer
 * component owns only the loading/error gate, and `HolidayFormBody` only ever mounts once
 * `existing.data` is already in hand, seeding its `useState` directly from it - never patching a
 * Select's value in via a useEffect after the fact, which is what silently broke Type population in
 * every Edit form before that fix.
 */
export function HolidayForm(props: HolidayFormProps) {
  const isEdit = props.mode === 'edit';
  const existing = useHoliday(isEdit ? props.holidayId : null);

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

  const initialValues: HolidayFormValues =
    isEdit && existing.data
      ? {
          date: existing.data.date.slice(0, 10),
          name: existing.data.name,
          type: existing.data.type,
          earlyCloseTime: existing.data.earlyCloseTime
            ? toTimeInputValue(existing.data.earlyCloseTime)
            : '',
        }
      : emptyHolidayFormValues;

  return (
    <HolidayFormBody
      mode={props.mode}
      holidayId={isEdit ? props.holidayId : undefined}
      initialValues={initialValues}
    />
  );
}

function HolidayFormBody({
  mode,
  holidayId,
  initialValues,
}: {
  mode: 'create' | 'edit';
  holidayId?: string;
  initialValues: HolidayFormValues;
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const { mutate: createHoliday, isPending: isCreating, error: createError } = useCreateHoliday();
  const { mutate: updateHoliday, isPending: isUpdating, error: updateError } = useUpdateHoliday();

  const [values, setValues] = useState<HolidayFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof HolidayFormValues, string>>>(
    {},
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = holidayFormSchema.safeParse(values);
    if (!result.success) {
      const errors: Partial<Record<keyof HolidayFormValues, string>> = {};
      for (const issue of result.error.issues) {
        errors[issue.path[0] as keyof HolidayFormValues] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      if (isEdit && holidayId) {
        await updateHoliday(holidayId, toUpdateHolidayRequest(result.data));
      } else {
        await createHoliday(toCreateHolidayRequest(result.data));
      }
      router.push('/dashboard/configuration/holidays');
    } catch {
      // surfaced via createError/updateError below
    }
  };

  const submitError = createError ?? updateError;
  const isSubmitting = isCreating || isUpdating;

  return (
    <div className="flex flex-col gap-4">
      <ConfigurationSectionHeader title={isEdit ? 'Edit Holiday' : 'Add Holiday'} />

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={values.date}
            onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
          />
          {fieldErrors.date && <p className="text-sm text-destructive">{fieldErrors.date}</p>}
        </div>

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
              setValues((prev) => ({ ...prev, type: value as HolidayType }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a holiday type" />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {HOLIDAY_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.type && <p className="text-sm text-destructive">{fieldErrors.type}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="earlyCloseTime">Early close time (optional)</Label>
          <Input
            id="earlyCloseTime"
            type="time"
            value={values.earlyCloseTime}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, earlyCloseTime: event.target.value }))
            }
          />
          {fieldErrors.earlyCloseTime && (
            <p className="text-sm text-destructive">{fieldErrors.earlyCloseTime}</p>
          )}
        </div>

        {submitError != null && (
          <p className="text-sm text-destructive">
            {isApiError(submitError) ? submitError.message : 'Something went wrong.'}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add Holiday'}
        </Button>
      </form>
    </div>
  );
}
