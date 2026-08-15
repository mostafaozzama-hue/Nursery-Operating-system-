import type {
  CreateDiscountRequest,
  Discount,
  DiscountQuery,
  Paginated,
  UpdateDiscountRequest,
} from '@nursery-os/contracts';
import { get, patch, post } from '../client';

export const discounts = {
  create: (body: CreateDiscountRequest) => post<Discount>('/discounts', body),
  list: (query?: DiscountQuery) => get<Paginated<Discount>>('/discounts', query),
  get: (id: string) => get<Discount>(`/discounts/${id}`),
  update: (id: string, body: UpdateDiscountRequest) => patch<Discount>(`/discounts/${id}`, body),
  activate: (id: string) => post<Discount>(`/discounts/${id}/activate`),
  deactivate: (id: string) => post<Discount>(`/discounts/${id}/deactivate`),
};
