import type { PaginationQuery } from '../common/pagination';

export const PAY_TYPES = ['HOURLY', 'SALARY'] as const;
export type PayType = (typeof PAY_TYPES)[number];

export const PAY_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export type PayrollSortField = 'effectiveDate' | 'createdAt';

export interface StaffPayroll {
  id: string;
  staffId: string;
  payType: PayType;
  payRate: string;
  payFrequency: PayFrequency;
  currency: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollQuery extends PaginationQuery {
  staffId?: string;
  payType?: PayType;
  sortBy?: PayrollSortField;
}

export interface CreatePayrollRequest {
  staffId: string;
  payType: PayType;
  payRate: number;
  payFrequency: PayFrequency;
  currency?: string;
  effectiveDate: string;
}

export type UpdatePayrollRequest = Partial<Omit<CreatePayrollRequest, 'staffId'>>;
