import type {
  CreateStaffRequest,
  Paginated,
  Staff,
  StaffQuery,
  UpdateStaffRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

export const staff = {
  create: (body: CreateStaffRequest) => post<Staff>('/staff', body),
  list: (query?: StaffQuery) => get<Paginated<Staff>>('/staff', query),
  get: (id: string) => get<Staff>(`/staff/${id}`),
  update: (id: string, body: UpdateStaffRequest) => patch<Staff>(`/staff/${id}`, body),
  remove: (id: string) => del<void>(`/staff/${id}`),
};
