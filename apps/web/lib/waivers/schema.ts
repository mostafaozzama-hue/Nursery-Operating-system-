import type {
  CreateWaiverRequest,
  UpdateWaiverRequest,
  WaiverReasonCode,
  WaiverType,
} from '@nursery-os/contracts';
import { z } from 'zod';
import { WAIVER_REASON_CODES, WAIVER_TYPES } from '@nursery-os/contracts';

const WAIVER_TYPE_VALUES = WAIVER_TYPES as unknown as [WaiverType, ...WaiverType[]];
const WAIVER_REASON_CODE_VALUES = WAIVER_REASON_CODES as unknown as [
  WaiverReasonCode,
  ...WaiverReasonCode[],
];

const percentageInRange = z
  .string()
  .trim()
  .min(1, 'Percentage is required')
  .refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
    'Enter a number between 0 and 100',
  );

/**
 * Shared shape between create and edit. reasonNote-required-when-OTHER and
 * effectiveTo-required-unless-reviewAnnually are server-state rules (the repository validates
 * against the merged final row on update, not just this patch) - deliberately not duplicated here,
 * same "rely on the backend's real error" philosophy as BillingTermsFields's own paired-field rules.
 */
const waiverFieldsShape = {
  percentage: percentageInRange,
  reasonCode: z.enum(WAIVER_REASON_CODE_VALUES, { message: 'Select a reason' }),
  reasonNote: z.string(),
  effectiveTo: z.string(),
  reviewAnnually: z.boolean(),
};

/** type and effectiveFrom are only ever set at create time - update-waiver.dto.ts excludes both. */
export const createWaiverFormSchema = z.object({
  ...waiverFieldsShape,
  type: z.enum(WAIVER_TYPE_VALUES, { message: 'Select a waiver type' }),
  effectiveFrom: z
    .string()
    .trim()
    .min(1, 'Effective date is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date'),
});

export const updateWaiverFormSchema = z.object(waiverFieldsShape);

export type WaiverFormValues = z.infer<typeof createWaiverFormSchema>;

export const emptyWaiverFormValues: WaiverFormValues = {
  type: '' as WaiverType,
  percentage: '',
  reasonCode: '' as WaiverReasonCode,
  reasonNote: '',
  effectiveFrom: '',
  effectiveTo: '',
  reviewAnnually: false,
};

export function toCreateWaiverRequest(values: WaiverFormValues): CreateWaiverRequest {
  return {
    type: values.type,
    percentage: Number(values.percentage),
    reasonCode: values.reasonCode,
    reasonNote: values.reasonNote.trim() || undefined,
    effectiveFrom: values.effectiveFrom.trim(),
    effectiveTo: values.effectiveTo || undefined,
    reviewAnnually: values.reviewAnnually,
  };
}

export function toUpdateWaiverRequest(
  values: Omit<WaiverFormValues, 'type' | 'effectiveFrom'>,
): UpdateWaiverRequest {
  return {
    percentage: Number(values.percentage),
    reasonCode: values.reasonCode,
    reasonNote: values.reasonNote.trim() || undefined,
    effectiveTo: values.effectiveTo || null,
    reviewAnnually: values.reviewAnnually,
  };
}
