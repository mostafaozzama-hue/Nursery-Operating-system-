import type {
  CreatePayrollRequest,
  PayFrequency,
  PayType,
  UpdatePayrollRequest,
} from '@nursery-os/contracts';
import { z } from 'zod';

export const payrollFormSchema = z.object({
  payType: z.enum(['HOURLY', 'SALARY']),
  payRate: z
    .string()
    .trim()
    .min(1, 'Pay rate is required')
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0,
      'Enter a positive number',
    ),
  payFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  currency: z.string().trim().min(1, 'Currency is required'),
  effectiveDate: z
    .string()
    .min(1, 'Effective date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
});

export type PayrollFormValues = z.infer<typeof payrollFormSchema>;

export const emptyPayrollFormValues: PayrollFormValues = {
  payType: 'SALARY',
  payRate: '',
  payFrequency: 'MONTHLY',
  currency: 'USD',
  effectiveDate: '',
};

export function toCreatePayrollRequest(
  values: PayrollFormValues,
  staffId: string,
): CreatePayrollRequest {
  return {
    staffId,
    payType: values.payType as PayType,
    payRate: Number(values.payRate),
    payFrequency: values.payFrequency as PayFrequency,
    currency: values.currency.trim(),
    effectiveDate: values.effectiveDate,
  };
}

export function toUpdatePayrollRequest(values: PayrollFormValues): UpdatePayrollRequest {
  return {
    payType: values.payType as PayType,
    payRate: Number(values.payRate),
    payFrequency: values.payFrequency as PayFrequency,
    currency: values.currency.trim(),
    effectiveDate: values.effectiveDate,
  };
}
