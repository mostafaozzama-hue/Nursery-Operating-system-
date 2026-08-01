import type {
  CreatePlanRequest,
  Paginated,
  Plan,
  PlanQuery,
  UpdatePlanRequest,
} from '@nursery-os/contracts';
import { get, patch, post } from '../client';

/** activate/deactivate deliberately not added yet - no consumer until Plan Detail ships. */
export const plans = {
  create: (body: CreatePlanRequest) => post<Plan>('/plans', body),
  list: (query?: PlanQuery) => get<Paginated<Plan>>('/plans', query),
  get: (id: string) => get<Plan>(`/plans/${id}`),
  update: (id: string, body: UpdatePlanRequest) => patch<Plan>(`/plans/${id}`, body),
};
