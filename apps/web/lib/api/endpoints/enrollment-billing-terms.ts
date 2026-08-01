import type { ChangeBillingTermsRequest, EnrollmentBillingTerms } from '@nursery-os/contracts';
import { get, patch } from '../client';

/** Nested under an Enrollment. No dedicated create/remove route - `change` (PATCH) dispatches server-side between creating billing terms for the first time and changing existing ones (EnrollmentBillingTermsService.changeTerms), so this same call works for both. */
export const enrollmentBillingTerms = {
  get: (enrollmentId: string) =>
    get<EnrollmentBillingTerms>(`/enrollments/${enrollmentId}/billing-terms`),
  change: (enrollmentId: string, body: ChangeBillingTermsRequest) =>
    patch<EnrollmentBillingTerms>(`/enrollments/${enrollmentId}/billing-terms`, body),
};
