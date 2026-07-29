/** Plan.scheduleDaysOfWeek - the permitted attendance days for this plan. */
export const PLAN_DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type PlanDayOfWeek = (typeof PLAN_DAYS_OF_WEEK)[number];
