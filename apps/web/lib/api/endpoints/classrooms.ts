import type {
  Classroom,
  ClassroomQuery,
  CreateClassroomRequest,
  Paginated,
  UpdateClassroomRequest,
} from '@nursery-os/contracts';
import { del, get, patch, post } from '../client';

export const classrooms = {
  create: (body: CreateClassroomRequest) => post<Classroom>('/classrooms', body),
  list: (query?: ClassroomQuery) => get<Paginated<Classroom>>('/classrooms', query),
  get: (id: string) => get<Classroom>(`/classrooms/${id}`),
  update: (id: string, body: UpdateClassroomRequest) => patch<Classroom>(`/classrooms/${id}`, body),
  remove: (id: string) => del<void>(`/classrooms/${id}`),
};
