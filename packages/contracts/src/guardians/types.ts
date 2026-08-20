import type { PaginationQuery } from '../common/pagination';

export interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  // Easy Enrollment (Product Gap H). Nullable.
  address: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GuardianSortField = 'firstName' | 'lastName' | 'createdAt';

export interface GuardianQuery extends PaginationQuery {
  name?: string;
  email?: string;
  sortBy?: GuardianSortField;
}

export interface CreateGuardianRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type UpdateGuardianRequest = Partial<CreateGuardianRequest>;
