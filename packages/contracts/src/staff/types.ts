import type { PaginationQuery } from '../common/pagination';

export type StaffSortField = 'firstName' | 'lastName' | 'hireDate' | 'createdAt';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  userId: string | null;
  classroomId: string | null;
  position: string | null;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQuery extends PaginationQuery {
  name?: string;
  classroomId?: string;
  position?: string;
  sortBy?: StaffSortField;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  position?: string;
  hireDate?: string;
  classroomId?: string;
  userId?: string;
}

export type UpdateStaffRequest = Partial<CreateStaffRequest>;
