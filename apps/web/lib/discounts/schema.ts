import type {
  CreateDiscountRequest,
  DiscountScope,
  DiscountType,
  UpdateDiscountRequest,
} from '@nursery-os/contracts';
import { z } from 'zod';
import { DISCOUNT_SCOPES, DISCOUNT_TYPES } from '@nursery-os/contracts';

const DISCOUNT_TYPE_VALUES = DISCOUNT_TYPES as unknown as [DiscountType, ...DiscountType[]];
const DISCOUNT_SCOPE_VALUES = DISCOUNT_SCOPES as unknown as [DiscountScope, ...DiscountScope[]];

const nonNegativeAmount = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
    'Enter a number 0 or greater',
  );

export const discountFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(DISCOUNT_TYPE_VALUES, { message: 'Select a discount type' }),
  amount: nonNegativeAmount,
  stackable: z.boolean(),
  scope: z.enum(DISCOUNT_SCOPE_VALUES, { message: 'Select a scope' }),
});

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

export const emptyDiscountFormValues: DiscountFormValues = {
  name: '',
  type: '' as DiscountType,
  amount: '',
  stackable: false,
  scope: 'BASE_TUITION_ONLY',
};

export function toCreateDiscountRequest(values: DiscountFormValues): CreateDiscountRequest {
  return {
    name: values.name.trim(),
    type: values.type,
    amount: Number(values.amount),
    stackable: values.stackable,
    scope: values.scope,
  };
}

/** Edit reuses the same form shape as create - Discount's update fields are a strict subset (isActive is deliberately excluded, it's its own action). */
export function toUpdateDiscountRequest(values: DiscountFormValues): UpdateDiscountRequest {
  return toCreateDiscountRequest(values);
}
