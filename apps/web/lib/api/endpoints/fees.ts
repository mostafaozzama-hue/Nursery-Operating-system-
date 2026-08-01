import type {
  CreateFeeRequest,
  Fee,
  FeeQuery,
  Paginated,
  UpdateFeeRequest,
} from '@nursery-os/contracts';
import { get, patch, post } from '../client';

export const fees = {
  create: (body: CreateFeeRequest) => post<Fee>('/fees', body),
  list: (query?: FeeQuery) => get<Paginated<Fee>>('/fees', query),
  get: (id: string) => get<Fee>(`/fees/${id}`),
  update: (id: string, body: UpdateFeeRequest) => patch<Fee>(`/fees/${id}`, body),
  activate: (id: string) => post<Fee>(`/fees/${id}/activate`),
  deactivate: (id: string) => post<Fee>(`/fees/${id}/deactivate`),
};
