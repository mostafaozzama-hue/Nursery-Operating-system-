import type {
  CreateHolidayRequest,
  Holiday,
  HolidayQuery,
  Paginated,
  UpdateHolidayRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

/** The only Tier A entity with a real remove() - Holiday has no isActive/activate/deactivate at all. */
export const holidays = {
  create: (body: CreateHolidayRequest) => post<Holiday>('/holidays', body),
  list: (query?: HolidayQuery) => get<Paginated<Holiday>>('/holidays', query),
  get: (id: string) => get<Holiday>(`/holidays/${id}`),
  update: (id: string, body: UpdateHolidayRequest) => patch<Holiday>(`/holidays/${id}`, body),
  remove: (id: string) => del<void>(`/holidays/${id}`),
};
