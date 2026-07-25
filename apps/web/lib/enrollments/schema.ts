import type {
  CreateEnrollmentRequest,
  TransferEnrollmentRequest,
  UpdateEnrollmentRequest,
  WithdrawEnrollmentRequest,
} from '@nursery-os/contracts';
import { z } from 'zod';

/**
 * Enroll, transfer, withdraw, and reason-correction all take the exact same
 * shape - one optional free-text reason, capped at 500 chars to match the
 * backend's @MaxLength(500) on every one of these fields. Shared here rather
 * than duplicated four times; each call site still maps it to the correct
 * backend field name below.
 */
const reasonSchema = z.object({
  reason: z.string().trim().max(500, 'Keep it under 500 characters'),
});

export type ReasonFormValues = z.infer<typeof reasonSchema>;
export const emptyReasonFormValues: ReasonFormValues = { reason: '' };

export const enrollFormSchema = reasonSchema;
export const transferFormSchema = reasonSchema;
export const withdrawFormSchema = reasonSchema;
export const editReasonFormSchema = reasonSchema;

export function toCreateEnrollmentRequest(
  childId: string,
  classroomId: string | null,
  values: ReasonFormValues,
): CreateEnrollmentRequest {
  return {
    childId,
    classroomId: classroomId ?? undefined,
    createdReason: values.reason.trim() || undefined,
  };
}

export function toTransferEnrollmentRequest(
  newClassroomId: string,
  values: ReasonFormValues,
): TransferEnrollmentRequest {
  return { newClassroomId, reason: values.reason.trim() || undefined };
}

export function toWithdrawEnrollmentRequest(values: ReasonFormValues): WithdrawEnrollmentRequest {
  return { reason: values.reason.trim() || undefined };
}

export function toUpdateEnrollmentRequest(values: ReasonFormValues): UpdateEnrollmentRequest {
  return { createdReason: values.reason.trim() || undefined };
}
