import type {
  ChildGuardian,
  ChildGuardianQuery,
  CreateChildGuardianRequest,
  Paginated,
  UpdateChildGuardianRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

export const childGuardians = {
  create: (body: CreateChildGuardianRequest) => post<ChildGuardian>('/child-guardians', body),
  list: (query?: ChildGuardianQuery) => get<Paginated<ChildGuardian>>('/child-guardians', query),
  get: (id: string) => get<ChildGuardian>(`/child-guardians/${id}`),
  update: (id: string, body: UpdateChildGuardianRequest) =>
    patch<ChildGuardian>(`/child-guardians/${id}`, body),
  remove: (id: string) => del<void>(`/child-guardians/${id}`),
};
