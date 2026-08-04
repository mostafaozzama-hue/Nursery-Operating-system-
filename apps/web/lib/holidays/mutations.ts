'use client';

import type { CreateHolidayRequest, Holiday, UpdateHolidayRequest } from '@nursery-os/contracts';
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

export function useCreateHoliday(): MutationResult<[CreateHolidayRequest], Holiday> {
  return useApiMutation(api.holidays.create);
}

export function useUpdateHoliday(): MutationResult<[string, UpdateHolidayRequest], Holiday> {
  return useApiMutation((id: string, body: UpdateHolidayRequest) => api.holidays.update(id, body));
}

export function useRemoveHoliday(): MutationResult<[string], void> {
  return useApiMutation(api.holidays.remove);
}
