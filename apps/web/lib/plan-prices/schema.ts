import type { SetPlanPriceRequest } from '@nursery-os/contracts';
import { z } from 'zod';

export const setPlanPriceFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
      'Enter a number 0 or greater',
    ),
  effectiveFrom: z
    .string()
    .trim()
    .min(1, 'Effective date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
});

export type SetPlanPriceFormValues = z.infer<typeof setPlanPriceFormSchema>;

export const emptySetPlanPriceFormValues: SetPlanPriceFormValues = {
  amount: '',
  effectiveFrom: '',
};

export function toSetPlanPriceRequest(values: SetPlanPriceFormValues): SetPlanPriceRequest {
  return {
    amount: Number(values.amount),
    effectiveFrom: values.effectiveFrom.trim(),
  };
}
