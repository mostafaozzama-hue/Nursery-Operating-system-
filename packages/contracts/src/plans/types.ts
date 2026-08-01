import type { PaginationQuery } from '../common/pagination';

// Matches domain-model.md's Plan.billingCycle vocabulary exactly.
export const PLAN_BILLING_CYCLES = ['MONTHLY', 'WEEKLY', 'DAILY'] as const;
export type PlanBillingCycle = (typeof PLAN_BILLING_CYCLES)[number];

// Plan.scheduleDaysOfWeek - the permitted attendance days for this plan.
export const PLAN_DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type PlanDayOfWeek = (typeof PLAN_DAYS_OF_WEEK)[number];

export const PLAN_SORT_FIELDS = ['name', 'billingCycle', 'createdAt'] as const;
export type PlanSortField = (typeof PLAN_SORT_FIELDS)[number];

export interface Plan {
  id: string;
  name: string;
  billingCycle: PlanBillingCycle;
  scheduleDaysOfWeek: PlanDayOfWeek[];
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanQuery extends PaginationQuery {
  name?: string;
  isActive?: boolean;
  sortBy?: PlanSortField;
}

export interface CreatePlanRequest {
  name: string;
  billingCycle: PlanBillingCycle;
  scheduleDaysOfWeek: PlanDayOfWeek[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
}

export interface UpdatePlanRequest {
  name?: string;
  billingCycle?: PlanBillingCycle;
  scheduleDaysOfWeek?: PlanDayOfWeek[];
  scheduleStartTime?: string | null;
  scheduleEndTime?: string | null;
}
