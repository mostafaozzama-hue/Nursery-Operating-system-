import type {
  CreateWaiverRequest,
  Paginated,
  UpdateWaiverRequest,
  Waiver,
  WaiverQuery,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

/** Nested under Child - no top-level Waiver resource. remove is a real DELETE (Easy Enrollment, Product Gap H phase 2 waiver bug fix) - soft-deletes the waiver outright. */
export const waivers = {
  create: (childId: string, body: CreateWaiverRequest) =>
    post<Waiver>(`/children/${childId}/waivers`, body),
  update: (childId: string, id: string, body: UpdateWaiverRequest) =>
    patch<Waiver>(`/children/${childId}/waivers/${id}`, body),
  remove: (childId: string, id: string) => del<void>(`/children/${childId}/waivers/${id}`),
  list: (childId: string, query?: WaiverQuery) =>
    get<Paginated<Waiver>>(`/children/${childId}/waivers`, query),
};
