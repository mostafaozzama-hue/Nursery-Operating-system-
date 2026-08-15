'use client';

import type {
  Attendance,
  CheckInRequest,
  CheckOutRequest,
  MarkAbsentRequest,
  UpdateAttendanceRequest,
} from '@nursery-os/contracts';
import { useState } from 'react';
import { api } from '@/lib/api';

interface MutationResult<TArgs extends unknown[], TResult> {
  mutate: (...args: TArgs) => Promise<TResult>;
  isPending: boolean;
  error: unknown;
}

function useApiMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): MutationResult<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const mutate = async (...args: TArgs) => {
    setIsPending(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, error };
}

export function useCheckIn(): MutationResult<[CheckInRequest], Attendance> {
  return useApiMutation(api.attendance.checkIn);
}

export function useCheckOut(): MutationResult<[string, CheckOutRequest], Attendance> {
  return useApiMutation((id: string, body: CheckOutRequest) => api.attendance.checkOut(id, body));
}

export function useMarkAbsent(): MutationResult<[MarkAbsentRequest], Attendance> {
  return useApiMutation(api.attendance.markAbsent);
}

export function useUpdateAttendance(): MutationResult<
  [string, UpdateAttendanceRequest],
  Attendance
> {
  return useApiMutation((id: string, body: UpdateAttendanceRequest) =>
    api.attendance.update(id, body),
  );
}
