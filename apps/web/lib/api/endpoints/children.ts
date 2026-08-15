import type {
  Child,
  ChildQuery,
  CreateChildRequest,
  Paginated,
  UpdateChildRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

export const children = {
  create: (body: CreateChildRequest) => post<Child>('/children', body),
  list: (query?: ChildQuery) => get<Paginated<Child>>('/children', query),
  get: (id: string) => get<Child>(`/children/${id}`),
  update: (id: string, body: UpdateChildRequest) => patch<Child>(`/children/${id}`, body),
  remove: (id: string) => del<void>(`/children/${id}`),
};
