import type { SetSiblingDiscountTierRequest } from '@nursery-os/contracts';
import { z } from 'zod';

const positiveIntThreshold = z
  .string()
  .trim()
  .min(1, 'Threshold is required')
  .refine(
    (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
    'Enter a whole number 1 or greater',
  );

/** Unlike Discount.amount's Min(0)-only client rule, this 0-100 bound is duplicated client-side on purpose - it's unconditional here (discountPercentage is always a percentage), matching the DTO's own unconditional @Max(100), not a sibling-field-dependent rule like Discount's. */
const percentage0To100 = z
  .string()
  .trim()
  .min(1, 'Discount percentage is required')
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
    'Enter a percentage between 0 and 100',
  );

export const setSiblingDiscountTierFormSchema = z.object({
  siblingCountThreshold: positiveIntThreshold,
  discountPercentage: percentage0To100,
  effectiveFrom: z
    .string()
    .trim()
    .min(1, 'Effective date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
});

export type SetSiblingDiscountTierFormValues = z.infer<typeof setSiblingDiscountTierFormSchema>;

export const emptySetSiblingDiscountTierFormValues: SetSiblingDiscountTierFormValues = {
  siblingCountThreshold: '',
  discountPercentage: '',
  effectiveFrom: '',
};

export function toSetSiblingDiscountTierRequest(
  values: SetSiblingDiscountTierFormValues,
): SetSiblingDiscountTierRequest {
  return {
    siblingCountThreshold: Number(values.siblingCountThreshold),
    discountPercentage: Number(values.discountPercentage),
    effectiveFrom: values.effectiveFrom.trim(),
  };
}
