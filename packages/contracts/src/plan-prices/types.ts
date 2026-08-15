import type { PaginationQuery } from '../common/pagination';

export const PLAN_PRICE_SORT_FIELDS = ['effectiveFrom', 'amount', 'createdAt'] as const;
export type PlanPriceSortField = (typeof PLAN_PRICE_SORT_FIELDS)[number];

/** amount is a string - PlanPrice.amount is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Invoice.totalAmount/InvoiceLineItem.unitAmount. No PATCH/DELETE - PlanPrice is historized only (setPrice closes the current open-ended row and opens a new one). */
export interface PlanPrice {
  id: string;
  planId: string;
  amount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPriceQuery extends PaginationQuery {
  sortBy?: PlanPriceSortField;
}

export interface SetPlanPriceRequest {
  amount: number;
  effectiveFrom: string;
}
