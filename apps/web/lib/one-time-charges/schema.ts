import type {
  AddOneTimeChargeRequest,
  ChargeCategory,
  ManualOverrideReasonCode,
} from '@nursery-os/contracts';
import { z } from 'zod';
import { CHARGE_CATEGORIES, MANUAL_OVERRIDE_REASON_CODES } from '@nursery-os/contracts';

const CHARGE_CATEGORY_VALUES = CHARGE_CATEGORIES as unknown as [
  ChargeCategory,
  ...ChargeCategory[],
];
const MANUAL_OVERRIDE_REASON_CODE_VALUES = MANUAL_OVERRIDE_REASON_CODES as unknown as [
  ManualOverrideReasonCode,
  ...ManualOverrideReasonCode[],
];

const positiveAmount = z
  .string()
  .trim()
  .min(1, 'Quantity is required')
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) > 0,
    'Enter a positive number',
  );

const nonNegativeAmount = z
  .string()
  .trim()
  .min(1, 'Unit amount is required')
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
    'Enter a number 0 or greater',
  );

/**
 * Shared shape between a DRAFT-invoice charge (reasonCode not required) and a non-DRAFT one
 * (reasonCode required - OneTimeChargeService.add's own 409). reasonNote-required-when-OTHER is a
 * server-state rule, deliberately not duplicated here - same "rely on the backend's real error"
 * philosophy as Waiver's identical rule.
 */
const oneTimeChargeFieldsShape = {
  description: z.string().trim().min(1, 'Description is required'),
  quantity: positiveAmount,
  unitAmount: nonNegativeAmount,
  chargeCategory: z.enum(CHARGE_CATEGORY_VALUES, { message: 'Select a category' }),
  reasonCode: z.string(),
  reasonNote: z.string(),
};

export const oneTimeChargeFormSchema = z.object(oneTimeChargeFieldsShape);

/**
 * reasonCode becomes required here - unlike reasonNote-required-when-OTHER (a genuine server-state
 * read), whether the target invoice is currently DRAFT is already known client-side (InvoiceDetail
 * already has the current Invoice in hand), so this one rule is safe to validate without duplicating
 * a fresh server read.
 */
export const oneTimeChargeOnNonDraftFormSchema = z.object({
  ...oneTimeChargeFieldsShape,
  reasonCode: z.enum(MANUAL_OVERRIDE_REASON_CODE_VALUES, {
    message: 'A reason is required when adding a charge to a non-draft invoice',
  }),
});

export type OneTimeChargeFormValues = z.infer<typeof oneTimeChargeFormSchema>;

export const emptyOneTimeChargeFormValues: OneTimeChargeFormValues = {
  description: '',
  quantity: '1',
  unitAmount: '',
  chargeCategory: '' as ChargeCategory,
  reasonCode: '',
  reasonNote: '',
};

export function toAddOneTimeChargeRequest(
  values: OneTimeChargeFormValues,
): AddOneTimeChargeRequest {
  return {
    description: values.description.trim(),
    quantity: Number(values.quantity),
    unitAmount: Number(values.unitAmount),
    chargeCategory: values.chargeCategory,
    reasonCode: (values.reasonCode || undefined) as ManualOverrideReasonCode | undefined,
    reasonNote: values.reasonNote.trim() || undefined,
  };
}
