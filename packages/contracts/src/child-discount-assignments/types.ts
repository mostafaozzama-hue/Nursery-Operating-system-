import type { PaginationQuery } from '../common/pagination';

export const CHILD_DISCOUNT_ASSIGNMENT_SORT_FIELDS = ['effectiveFrom', 'createdAt'] as const;
export type ChildDiscountAssignmentSortField =
  (typeof CHILD_DISCOUNT_ASSIGNMENT_SORT_FIELDS)[number];

/** snapshotAmount is a string - ChildDiscountAssignment.snapshotAmount is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Discount.amount. Captured at assignment time - Discount.amount changing later never reprices this row. effectiveFrom/effectiveTo are @db.Date. */
export interface ChildDiscountAssignment {
  id: string;
  childId: string;
  discountId: string;
  snapshotAmount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChildDiscountAssignmentQuery extends PaginationQuery {
  sortBy?: ChildDiscountAssignmentSortField;
}

/** discountId is not a field here - it's a URL param on assign (POST .../discount-assignments/:discountId), matching §4's frozen signature. */
export interface AssignChildDiscountRequest {
  effectiveFrom: string;
  /** For a bounded promotional discount, known upfront. Must be after effectiveFrom. */
  effectiveTo?: string;
}

export interface ExpireChildDiscountRequest {
  effectiveTo: string;
}
