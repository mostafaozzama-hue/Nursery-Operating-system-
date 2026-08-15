import type {
  CreateGuardianRequest,
  Guardian,
  GuardianQuery,
  Paginated,
  UpdateGuardianRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

export const guardians = {
  create: (body: CreateGuardianRequest) => post<Guardian>('/guardians', body),
  list: (query?: GuardianQuery) => get<Paginated<Guardian>>('/guardians', query),
  get: (id: string) => get<Guardian>(`/guardians/${id}`),
  update: (id: string, body: UpdateGuardianRequest) => patch<Guardian>(`/guardians/${id}`, body),
  remove: (id: string) => del<void>(`/guardians/${id}`),
};
