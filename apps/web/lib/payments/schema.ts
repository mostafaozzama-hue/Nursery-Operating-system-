import type { PaymentMethod, RecordPaymentRequest } from '@nursery-os/contracts';
import { z } from 'zod';
import { PAYMENT_METHODS } from '@nursery-os/contracts';

function isBlankOrValidDate(value: string): boolean {
  return value === '' || !Number.isNaN(Date.parse(value));
}

const positiveAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
      `Enter a positive number`,
    );

const PAYMENT_METHOD_VALUES = PAYMENT_METHODS as unknown as [PaymentMethod, ...PaymentMethod[]];

export const recordPaymentFormSchema = z.object({
  amount: positiveAmount('Amount'),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  paidAt: z.string().trim().refine(isBlankOrValidDate, 'Enter a valid date'),
});

export type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>;

export const emptyRecordPaymentFormValues: RecordPaymentFormValues = {
  amount: '',
  paymentMethod: 'CASH',
  paidAt: '',
};

export function toRecordPaymentRequest(values: RecordPaymentFormValues): RecordPaymentRequest {
  return {
    amount: Number(values.amount),
    paymentMethod: values.paymentMethod,
    paidAt: values.paidAt.trim() || undefined,
  };
}
