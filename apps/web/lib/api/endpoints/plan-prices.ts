import type {
  Paginated,
  PlanPrice,
  PlanPriceQuery,
  SetPlanPriceRequest,
} from '@nursery-os/contracts';
import { get, post } from '../client';

/** Nested under a Plan - no top-level PlanPrice resource. No update/remove: historized only, setPrice always appends. */
export const planPrices = {
  list: (planId: string, query?: PlanPriceQuery) =>
    get<Paginated<PlanPrice>>(`/plans/${planId}/prices`, query),
  setPrice: (planId: string, body: SetPlanPriceRequest) =>
    post<PlanPrice>(`/plans/${planId}/prices`, body),
};
