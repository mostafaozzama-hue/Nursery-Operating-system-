import type { CreatePlanRequest, PlanBillingCycle, UpdatePlanRequest } from '@nursery-os/contracts';
import { z } from 'zod';
import { PLAN_BILLING_CYCLES, PLAN_DAYS_OF_WEEK } from '@nursery-os/contracts';

const BILLING_CYCLE_VALUES = PLAN_BILLING_CYCLES as unknown as [
  PlanBillingCycle,
  ...PlanBillingCycle[],
];

export const planFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  billingCycle: z.enum(BILLING_CYCLE_VALUES, { message: 'Select a billing cycle' }),
  scheduleDaysOfWeek: z.array(z.enum(PLAN_DAYS_OF_WEEK)),
  scheduleStartTime: z.string(),
  scheduleEndTime: z.string(),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

export const emptyPlanFormValues: PlanFormValues = {
  name: '',
  billingCycle: '' as PlanBillingCycle,
  scheduleDaysOfWeek: [],
  scheduleStartTime: '',
  scheduleEndTime: '',
};

export function toCreatePlanRequest(values: PlanFormValues): CreatePlanRequest {
  return {
    name: values.name.trim(),
    billingCycle: values.billingCycle,
    scheduleDaysOfWeek: values.scheduleDaysOfWeek,
    scheduleStartTime: values.scheduleStartTime || undefined,
    scheduleEndTime: values.scheduleEndTime || undefined,
  };
}

/** Edit reuses the same form shape as create - Plan's update fields are a strict subset (isActive is deliberately excluded, it's its own action). */
export function toUpdatePlanRequest(values: PlanFormValues): UpdatePlanRequest {
  return toCreatePlanRequest(values);
}
