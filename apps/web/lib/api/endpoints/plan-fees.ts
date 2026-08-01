import type { AttachPlanFeeRequest, PlanFee } from '@nursery-os/contracts';
import { del, get, post } from '../client';

/** Nested under a Plan - no top-level PlanFee resource. GET returns a plain array, not Paginated<T> - a Plan's attached Fees are expected to stay small. No update: changing isMandatory is detach then re-attach, matching the backend's own frozen method set. */
export const planFees = {
  list: (planId: string) => get<PlanFee[]>(`/plans/${planId}/fees`),
  attach: (planId: string, body: AttachPlanFeeRequest) =>
    post<PlanFee>(`/plans/${planId}/fees`, body),
  detach: (planId: string, feeId: string) => del<void>(`/plans/${planId}/fees/${feeId}`),
};
