import type { PaginationQuery } from '../common/pagination';

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
}
