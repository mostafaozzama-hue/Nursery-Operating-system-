'use client';

import type { CreatePlanRequest, Plan, UpdatePlanRequest } from '@nursery-os/contracts';
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

export function useCreatePlan(): MutationResult<[CreatePlanRequest], Plan> {
  return useApiMutation(api.plans.create);
}

export function useUpdatePlan(): MutationResult<[string, UpdatePlanRequest], Plan> {
  return useApiMutation((id: string, body: UpdatePlanRequest) => api.plans.update(id, body));
}
