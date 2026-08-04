import type { PaginationQuery } from '../common/pagination';

export const BILLING_RUN_STATUSES = ['COMPLETED', 'PARTIAL_FAILURE'] as const;
export type BillingRunStatus = (typeof BILLING_RUN_STATUSES)[number];

export const BILLING_RUN_SORT_FIELDS = ['periodStart', 'runAt', 'createdAt'] as const;
export type BillingRunSortField = (typeof BILLING_RUN_SORT_FIELDS)[number];

/** periodStart/periodEnd are @db.Date (plain calendar dates, no UTC handling needed). runAt/createdAt/updatedAt are plain DateTime (full timestamps). Per-child failure detail is never persisted beyond this aggregate status - a deliberate design decision (ADR-0017 rejected a BillingRunEvent audit entity), not a gap to work around. */
export interface BillingRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: BillingRunStatus;
  runAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingRunQuery extends PaginationQuery {
  sortBy?: BillingRunSortField;
}

export interface CreateBillingRunRequest {
  periodStart: string;
  periodEnd: string;
}
