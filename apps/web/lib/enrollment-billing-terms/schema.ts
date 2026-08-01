import type {
  ChangeBillingTermsRequest,
  DepositRefundPolicy,
  OpenBillingTermsRequest,
} from '@nursery-os/contracts';
import { z } from 'zod';

/**
 * customRateReason/depositRefundPolicy being required alongside their paired
 * amount is enforced by the backend (@ValidateIf), not duplicated here -
 * same "rely on the backend's real error" philosophy already used for
 * PlanPrice's effectiveFrom-after-current-period rule. Client-side, these
 * are just format-level checks.
 */
const optionalNonNegativeAmount = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0),
    'Enter a number 0 or greater',
  );

/** Shared shape between the Enroll form's billing-terms section and the Change Billing Terms sheet - same fields, only billingGuardianId's requiredness and the presence of effectiveFrom differ. */
const billingTermsFieldsShape = {
  planId: z.string(),
  billingGuardianId: z.string(),
  customRateAmount: optionalNonNegativeAmount,
  customRateReason: z.string(),
  depositAmount: optionalNonNegativeAmount,
  depositRefundPolicy: z.string(),
  withdrawalNoticeGivenDate: z.string(),
};

/**
 * customRateReason/depositRefundPolicy are only ever included alongside
 * their paired amount, even though the fields hiding them (BillingTermsFields'
 * conditional rendering) and the fields themselves are otherwise independent
 * pieces of state - clearing an amount after typing its paired text field
 * hides the input but does not clear its state, so without this guard a
 * stray reason/policy could be submitted with no amount at all.
 */
function toOptionalBillingTermsFields(values: {
  planId: string;
  customRateAmount: string;
  customRateReason: string;
  depositAmount: string;
  depositRefundPolicy: string;
  withdrawalNoticeGivenDate: string;
}) {
  const hasCustomRate = values.customRateAmount !== '';
  const hasDeposit = values.depositAmount !== '';

  return {
    planId: values.planId || undefined,
    customRateAmount: hasCustomRate ? Number(values.customRateAmount) : undefined,
    customRateReason: hasCustomRate ? values.customRateReason.trim() || undefined : undefined,
    depositAmount: hasDeposit ? Number(values.depositAmount) : undefined,
    depositRefundPolicy: hasDeposit
      ? ((values.depositRefundPolicy || undefined) as DepositRefundPolicy | undefined)
      : undefined,
    withdrawalNoticeGivenDate: values.withdrawalNoticeGivenDate || undefined,
  };
}

/** Used only when the Enroll form's billing-terms disclosure is actually opened - billingGuardianId becomes required at that point, matching OpenBillingTermsDto's own validation. */
export const openBillingTermsFormSchema = z.object({
  ...billingTermsFieldsShape,
  billingGuardianId: z.string().min(1, 'Billing guardian is required'),
});

export type OpenBillingTermsFormValues = z.infer<typeof openBillingTermsFormSchema>;

export const emptyOpenBillingTermsFormValues: OpenBillingTermsFormValues = {
  planId: '',
  billingGuardianId: '',
  customRateAmount: '',
  customRateReason: '',
  depositAmount: '',
  depositRefundPolicy: '',
  withdrawalNoticeGivenDate: '',
};

export function toOpenBillingTermsRequest(
  values: OpenBillingTermsFormValues,
): OpenBillingTermsRequest {
  return {
    ...toOptionalBillingTermsFields(values),
    billingGuardianId: values.billingGuardianId,
  };
}

/** effectiveFrom is the only field this form adds over the shared shape - the standard (non-immediate) workflow only; the backend rejects a non-future date with a real 409 message, not duplicated here. */
export const changeBillingTermsFormSchema = z.object({
  ...billingTermsFieldsShape,
  effectiveFrom: z
    .string()
    .trim()
    .min(1, 'Effective date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
});

export type ChangeBillingTermsFormValues = z.infer<typeof changeBillingTermsFormSchema>;

export const emptyChangeBillingTermsFormValues: ChangeBillingTermsFormValues = {
  effectiveFrom: '',
  planId: '',
  billingGuardianId: '',
  customRateAmount: '',
  customRateReason: '',
  depositAmount: '',
  depositRefundPolicy: '',
  withdrawalNoticeGivenDate: '',
};

export function toChangeBillingTermsRequest(
  values: ChangeBillingTermsFormValues,
): ChangeBillingTermsRequest {
  return {
    ...toOptionalBillingTermsFields(values),
    effectiveFrom: values.effectiveFrom.trim(),
    billingGuardianId: values.billingGuardianId || undefined,
  };
}
