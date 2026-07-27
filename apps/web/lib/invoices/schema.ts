import type {
  CreateInvoiceRequest,
  CreateLineItemRequest,
  PaymentMethod,
  RecordPaymentRequest,
  UpdateLineItemRequest,
} from '@nursery-os/contracts';
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

const nonNegativeAmount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
      `Enter a number 0 or greater`,
    );

/** Mirrors CreateLineItemDto exactly - totalAmount is never accepted, always server-computed. */
export const lineItemFormSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  quantity: positiveAmount('Quantity'),
  unitAmount: nonNegativeAmount('Unit amount'),
});

export type LineItemFormValues = z.infer<typeof lineItemFormSchema>;

export const emptyLineItemFormValues: LineItemFormValues = {
  description: '',
  quantity: '1',
  unitAmount: '',
};

export function toCreateLineItemRequest(values: LineItemFormValues): CreateLineItemRequest {
  return {
    description: values.description.trim(),
    quantity: Number(values.quantity),
    unitAmount: Number(values.unitAmount),
  };
}

export function toUpdateLineItemRequest(values: LineItemFormValues): UpdateLineItemRequest {
  return toCreateLineItemRequest(values);
}

/** childId/billedToGuardianId are picker-driven state, not raw form fields - same split as StaffForm's classroomId/userId. */
export const invoiceFormSchema = z.object({
  dueDate: z.string().trim().refine(isBlankOrValidDate, 'Enter a valid date'),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const emptyInvoiceFormValues: InvoiceFormValues = {
  dueDate: '',
};

export function toCreateInvoiceRequest(
  values: InvoiceFormValues,
  childId: string,
  billedToGuardianId: string,
  lineItems: LineItemFormValues[],
): CreateInvoiceRequest {
  return {
    childId,
    billedToGuardianId,
    dueDate: values.dueDate.trim() || undefined,
    lineItems: lineItems.length > 0 ? lineItems.map(toCreateLineItemRequest) : undefined,
  };
}

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
