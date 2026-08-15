import type {
  CreateHolidayRequest,
  HolidayType,
  UpdateHolidayRequest,
} from '@nursery-os/contracts';
import { z } from 'zod';
import { HOLIDAY_TYPES } from '@nursery-os/contracts';

const HOLIDAY_TYPE_VALUES = HOLIDAY_TYPES as unknown as [HolidayType, ...HolidayType[]];

export const holidayFormSchema = z.object({
  date: z
    .string()
    .trim()
    .min(1, 'Date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(HOLIDAY_TYPE_VALUES, { message: 'Select a holiday type' }),
  /** Optional at both types - deliberately not required-when-PARTIAL_CLOSURE, matching the backend's own unconditional treatment (see docs/SESSION_CHECKPOINT.md §3). Format-only validation when present. */
  earlyCloseTime: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
      'Enter a time in HH:mm format',
    ),
});

export type HolidayFormValues = z.infer<typeof holidayFormSchema>;

export const emptyHolidayFormValues: HolidayFormValues = {
  date: '',
  name: '',
  type: '' as HolidayType,
  earlyCloseTime: '',
};

export function toCreateHolidayRequest(values: HolidayFormValues): CreateHolidayRequest {
  return {
    date: values.date.trim(),
    name: values.name.trim(),
    type: values.type,
    earlyCloseTime: values.earlyCloseTime || undefined,
  };
}

/** Edit reuses the same form shape as create, except earlyCloseTime must be sent as an explicit `null` to clear it - an omitted field leaves the stored value untouched (UpdateHolidayDto's own PATCH-merge semantics), unlike create's plain omission. */
export function toUpdateHolidayRequest(values: HolidayFormValues): UpdateHolidayRequest {
  return {
    date: values.date.trim(),
    name: values.name.trim(),
    type: values.type,
    earlyCloseTime: values.earlyCloseTime || null,
  };
}
