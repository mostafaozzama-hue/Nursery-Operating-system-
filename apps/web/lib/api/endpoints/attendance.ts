import type {
  Attendance,
  AttendanceQuery,
  CheckInRequest,
  CheckOutRequest,
  MarkAbsentRequest,
  Paginated,
  UpdateAttendanceRequest,
} from '@nursery-os/contracts';
import { get, patch, post } from '../client';

/** No `remove` - attendance is historical data, same as Enrollment (no DELETE route on the backend). */
export const attendance = {
  checkIn: (body: CheckInRequest) => post<Attendance>('/attendance/check-in', body),
  checkOut: (id: string, body: CheckOutRequest) =>
    post<Attendance>(`/attendance/${id}/check-out`, body),
  markAbsent: (body: MarkAbsentRequest) => post<Attendance>('/attendance/absent', body),
  list: (query?: AttendanceQuery) => get<Paginated<Attendance>>('/attendance', query),
  get: (id: string) => get<Attendance>(`/attendance/${id}`),
  update: (id: string, body: UpdateAttendanceRequest) =>
    patch<Attendance>(`/attendance/${id}`, body),
};
