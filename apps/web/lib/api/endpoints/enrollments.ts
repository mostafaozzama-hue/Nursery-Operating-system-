import type {
  CreateEnrollmentRequest,
  Enrollment,
  EnrollmentQuery,
  Paginated,
  TransferEnrollmentRequest,
  UpdateEnrollmentRequest,
  WithdrawEnrollmentRequest,
} from '@nursery-os/contracts';
import { get, patch, post } from '../client';

export const enrollments = {
  create: (body: CreateEnrollmentRequest) => post<Enrollment>('/enrollments', body),
  list: (query?: EnrollmentQuery) => get<Paginated<Enrollment>>('/enrollments', query),
  get: (id: string) => get<Enrollment>(`/enrollments/${id}`),
  update: (id: string, body: UpdateEnrollmentRequest) =>
    patch<Enrollment>(`/enrollments/${id}`, body),
  transfer: (id: string, body: TransferEnrollmentRequest) =>
    post<Enrollment>(`/enrollments/${id}/transfer`, body),
  withdraw: (id: string, body: WithdrawEnrollmentRequest) =>
    post<Enrollment>(`/enrollments/${id}/withdraw`, body),
};
