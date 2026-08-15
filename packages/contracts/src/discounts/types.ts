import type { PaginationQuery } from '../common/pagination';

// Matches domain-model.md's Discount.type vocabulary exactly.
export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// Matches domain-model.md's ERD block for Discount.scope exactly.
export const DISCOUNT_SCOPES = ['BASE_TUITION_ONLY', 'ALL_CHARGES'] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPES)[number];

export const DISCOUNT_SORT_FIELDS = ['name', 'amount', 'type', 'createdAt'] as const;
export type DiscountSortField = (typeof DISCOUNT_SORT_FIELDS)[number];

/** amount is a string - Discount.amount is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Fee.amount/PlanPrice.amount. */
export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  amount: string;
  stackable: boolean;
  scope: DiscountScope;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountQuery extends PaginationQuery {
  name?: string;
  type?: DiscountType;
  isActive?: boolean;
  sortBy?: DiscountSortField;
}

export interface CreateDiscountRequest {
  name: string;
  type: DiscountType;
  amount: number;
  stackable?: boolean;
  scope?: DiscountScope;
}

export interface UpdateDiscountRequest {
  name?: string;
  type?: DiscountType;
  amount?: number;
  stackable?: boolean;
  scope?: DiscountScope;
}
