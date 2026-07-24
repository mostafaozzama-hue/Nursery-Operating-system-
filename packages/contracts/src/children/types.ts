import type { PaginationQuery } from '../common/pagination';

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChildSortField = 'firstName' | 'lastName' | 'dateOfBirth' | 'createdAt';

export interface ChildQuery extends PaginationQuery {
  name?: string;
  sortBy?: ChildSortField;
}

export interface CreateChildRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  photoUrl?: string;
}

export type UpdateChildRequest = Partial<CreateChildRequest>;
