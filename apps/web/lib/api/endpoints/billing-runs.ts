import type {
  BillingRun,
  BillingRunQuery,
  CreateBillingRunRequest,
  Paginated,
} from '@nursery-os/contracts';
import { get, post } from '../client';

/** OWNER/ADMIN for both read and write (class-level @Roles), matching PayrollController's identical pattern - no update/delete, a BillingRun is never edited once triggered. */
export const billingRuns = {
  create: (body: CreateBillingRunRequest) => post<BillingRun>('/billing-runs', body),
  list: (query?: BillingRunQuery) => get<Paginated<BillingRun>>('/billing-runs', query),
  get: (id: string) => get<BillingRun>(`/billing-runs/${id}`),
};
