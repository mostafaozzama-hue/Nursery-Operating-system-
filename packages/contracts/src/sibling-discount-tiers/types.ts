import type { PaginationQuery } from '../common/pagination';

export const SIBLING_DISCOUNT_TIER_SORT_FIELDS = [
  'effectiveFrom',
  'siblingCountThreshold',
  'discountPercentage',
  'createdAt',
] as const;
export type SiblingDiscountTierSortField = (typeof SIBLING_DISCOUNT_TIER_SORT_FIELDS)[number];

/** discountPercentage is a string - SiblingDiscountTier.discountPercentage is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Discount.amount/Fee.amount/PlanPrice.amount. effectiveFrom/effectiveTo are @db.Date (calendar dates only), same shape as PlanPrice's. */
export interface SiblingDiscountTier {
  id: string;
  siblingCountThreshold: number;
  discountPercentage: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiblingDiscountTierQuery extends PaginationQuery {
  sortBy?: SiblingDiscountTierSortField;
}

export interface SetSiblingDiscountTierRequest {
  siblingCountThreshold: number;
  discountPercentage: number;
  effectiveFrom: string;
}
