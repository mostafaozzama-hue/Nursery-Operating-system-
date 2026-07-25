import type { PaginationQuery } from '../common/pagination';

export type StaffSortField = 'hireDate' | 'createdAt';

export interface Staff {
  id: string;
  userId: string | null;
  classroomId: string | null;
  position: string | null;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQuery extends PaginationQuery {
  classroomId?: string;
  position?: string;
  sortBy?: StaffSortField;
}

export interface CreateStaffRequest {
  position?: string;
  hireDate?: string;
  classroomId?: string;
  userId?: string;
}

export type UpdateStaffRequest = Partial<CreateStaffRequest>;
