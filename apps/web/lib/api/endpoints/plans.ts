import type {
  CreatePlanRequest,
  Paginated,
  Plan,
  PlanQuery,
  UpdatePlanRequest,
} from '@nursery-os/contracts';
import { get, patch, post } from '../client';

export const plans = {
  create: (body: CreatePlanRequest) => post<Plan>('/plans', body),
  list: (query?: PlanQuery) => get<Paginated<Plan>>('/plans', query),
  get: (id: string) => get<Plan>(`/plans/${id}`),
  update: (id: string, body: UpdatePlanRequest) => patch<Plan>(`/plans/${id}`, body),
  activate: (id: string) => post<Plan>(`/plans/${id}/activate`),
  deactivate: (id: string) => post<Plan>(`/plans/${id}/deactivate`),
};
