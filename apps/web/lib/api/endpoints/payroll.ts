import type {
  CreatePayrollRequest,
  Paginated,
  PayrollQuery,
  StaffPayroll,
  UpdatePayrollRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

export const payroll = {
  create: (body: CreatePayrollRequest) => post<StaffPayroll>('/payroll', body),
  list: (query?: PayrollQuery) => get<Paginated<StaffPayroll>>('/payroll', query),
  get: (id: string) => get<StaffPayroll>(`/payroll/${id}`),
  update: (id: string, body: UpdatePayrollRequest) => patch<StaffPayroll>(`/payroll/${id}`, body),
  remove: (id: string) => del<void>(`/payroll/${id}`),
};
