import type { PaginationQuery } from '../common/pagination';

export const ATTENDANCE_STATUSES = ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceSortField = 'date' | 'createdAt';

export interface Attendance {
  id: string;
  childId: string;
  classroomId: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  checkedInBy: string | null;
  checkedOutBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceQuery extends PaginationQuery {
  childId?: string;
  classroomId?: string;
  date?: string;
  status?: AttendanceStatus;
  sortBy?: AttendanceSortField;
}

export interface CheckInRequest {
  childId: string;
  classroomId?: string;
  checkInTime?: string;
}

export interface CheckOutRequest {
  checkOutTime?: string;
}

export interface MarkAbsentRequest {
  childId: string;
  classroomId?: string;
}

export interface UpdateAttendanceRequest {
  classroomId?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}
