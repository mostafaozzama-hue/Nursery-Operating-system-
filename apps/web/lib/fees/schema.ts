import type { CreateFeeRequest, FeeType, UpdateFeeRequest } from '@nursery-os/contracts';
import { z } from 'zod';
import { FEE_TYPES } from '@nursery-os/contracts';

const FEE_TYPE_VALUES = FEE_TYPES as unknown as [FeeType, ...FeeType[]];

const nonNegativeAmount = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
    'Enter a number 0 or greater',
  );

export const feeFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(FEE_TYPE_VALUES, { message: 'Select a fee type' }),
  amount: nonNegativeAmount,
});

export type FeeFormValues = z.infer<typeof feeFormSchema>;

export const emptyFeeFormValues: FeeFormValues = {
  name: '',
  type: '' as FeeType,
  amount: '',
};

export function toCreateFeeRequest(values: FeeFormValues): CreateFeeRequest {
  return {
    name: values.name.trim(),
    type: values.type,
    amount: Number(values.amount),
  };
}

/** Edit reuses the same form shape as create - Fee's update fields are a strict subset (isActive is deliberately excluded, it's its own action). */
export function toUpdateFeeRequest(values: FeeFormValues): UpdateFeeRequest {
  return toCreateFeeRequest(values);
}
