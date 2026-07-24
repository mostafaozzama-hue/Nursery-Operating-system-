import type { PaginationQuery } from '../common/pagination';

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export type ClassroomSortField = 'name' | 'capacity' | 'createdAt';

export interface ClassroomQuery extends PaginationQuery {
  name?: string;
  sortBy?: ClassroomSortField;
}

export interface CreateClassroomRequest {
  name: string;
  capacity: number;
}

export type UpdateClassroomRequest = Partial<CreateClassroomRequest>;
