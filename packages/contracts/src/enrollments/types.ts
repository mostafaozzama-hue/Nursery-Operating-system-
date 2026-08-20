import type { PaginationQuery } from '../common/pagination';
import type { OpenBillingTermsRequest } from '../enrollment-billing-terms/types';

export const ENROLLMENT_STATUSES = ['WAITLISTED', 'ACTIVE', 'WITHDRAWN'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export type EnrollmentSortField = 'startDate' | 'endDate' | 'createdAt';

export interface Enrollment {
  id: string;
  childId: string;
  classroomId: string | null;
  status: EnrollmentStatus;
  startDate: string;
  endDate: string | null;
  // Easy Enrollment (Product Gap H, phase 2). User-entered expected/target
  // withdrawal date - informational only, distinct from endDate (the real
  // lifecycle field, set only by transfer/withdraw). Never auto-invented.
  plannedEndDate: string | null;
  createdReason: string | null;
  endedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentQuery extends PaginationQuery {
  childId?: string;
  classroomId?: string;
  status?: EnrollmentStatus;
  open?: boolean;
  sortBy?: EnrollmentSortField;
}

export interface CreateEnrollmentRequest {
  childId: string;
  classroomId?: string;
  createdReason?: string;
  plannedEndDate?: string;
  billingTerms?: OpenBillingTermsRequest;
}

export interface TransferEnrollmentRequest {
  newClassroomId: string;
  reason?: string;
}

export interface WithdrawEnrollmentRequest {
  reason?: string;
}

export interface UpdateEnrollmentRequest {
  createdReason?: string;
  plannedEndDate?: string | null;
}
