import type { PaginationQuery } from '../common/pagination';

export const MEMBERSHIP_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface Membership {
  id: string;
  userId: string;
  email: string;
  tenantId: string;
  roleKey: string;
  status: MembershipStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipQuery extends PaginationQuery {
  status?: MembershipStatus;
  roleKey?: string;
}
