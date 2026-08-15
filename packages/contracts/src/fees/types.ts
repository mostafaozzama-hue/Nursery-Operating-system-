import type { PaginationQuery } from '../common/pagination';

// Matches domain-model.md's Fee.type vocabulary exactly.
export const FEE_TYPES = ['RECURRING', 'ONE_TIME'] as const;
export type FeeType = (typeof FEE_TYPES)[number];

export const FEE_SORT_FIELDS = ['name', 'amount', 'type', 'createdAt'] as const;
export type FeeSortField = (typeof FEE_SORT_FIELDS)[number];

/** amount is a string - Fee.amount is a Prisma Decimal column, which serializes as a JSON string over the wire, same as Invoice.totalAmount/InvoiceLineItem.unitAmount. */
export interface Fee {
  id: string;
  name: string;
  type: FeeType;
  amount: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeQuery extends PaginationQuery {
  name?: string;
  type?: FeeType;
  isActive?: boolean;
  sortBy?: FeeSortField;
}

export interface CreateFeeRequest {
  name: string;
  type: FeeType;
  amount: number;
}

export interface UpdateFeeRequest {
  name?: string;
  type?: FeeType;
  amount?: number;
}
