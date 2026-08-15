'use client';

import type { CreateFeeRequest, Fee, UpdateFeeRequest } from '@nursery-os/contracts';
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

export function useCreateFee(): MutationResult<[CreateFeeRequest], Fee> {
  return useApiMutation(api.fees.create);
}

export function useUpdateFee(): MutationResult<[string, UpdateFeeRequest], Fee> {
  return useApiMutation((id: string, body: UpdateFeeRequest) => api.fees.update(id, body));
}

export function useActivateFee(): MutationResult<[string], Fee> {
  return useApiMutation(api.fees.activate);
}

export function useDeactivateFee(): MutationResult<[string], Fee> {
  return useApiMutation(api.fees.deactivate);
}
