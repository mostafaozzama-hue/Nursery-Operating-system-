import type { CreateBillingRunRequest } from '@nursery-os/contracts';
import { z } from 'zod';

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date');

/**
 * No periodEnd-after-periodStart check duplicated here - CreateBillingRunDto itself has no such
 * validation either (confirmed by reading the backend source), so there is no server-state rule to
 * mirror or defer to; a backwards range simply matches zero eligible children and produces an empty,
 * harmless run.
 */
export const billingRunFormSchema = z.object({
  periodStart: requiredDate('Period start'),
  periodEnd: requiredDate('Period end'),
});

export type BillingRunFormValues = z.infer<typeof billingRunFormSchema>;

export const emptyBillingRunFormValues: BillingRunFormValues = {
  periodStart: '',
  periodEnd: '',
};

export function toCreateBillingRunRequest(values: BillingRunFormValues): CreateBillingRunRequest {
  return {
    periodStart: values.periodStart.trim(),
    periodEnd: values.periodEnd.trim(),
  };
}
