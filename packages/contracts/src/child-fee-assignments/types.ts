import type { PaginationQuery } from '../common/pagination';

export const CHILD_FEE_ASSIGNMENT_SORT_FIELDS = ['effectiveFrom', 'createdAt'] as const;
export type ChildFeeAssignmentSortField = (typeof CHILD_FEE_ASSIGNMENT_SORT_FIELDS)[number];

/** snapshotAmount is a string - ChildFeeAssignment.snapshotAmount is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Fee.amount. Captured at assignment time - Fee.amount changing later never reprices this row. effectiveFrom/effectiveTo are @db.Date. */
export interface ChildFeeAssignment {
  id: string;
  childId: string;
  feeId: string;
  snapshotAmount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChildFeeAssignmentQuery extends PaginationQuery {
  sortBy?: ChildFeeAssignmentSortField;
}

export interface AssignChildFeeRequest {
  feeId: string;
  effectiveFrom: string;
}

export interface UnassignChildFeeRequest {
  effectiveTo: string;
}
