'use client';

import type { CreateWaiverRequest, UpdateWaiverRequest, Waiver } from '@nursery-os/contracts';
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

export function useCreateWaiver(): MutationResult<[string, CreateWaiverRequest], Waiver> {
  return useApiMutation((childId: string, body: CreateWaiverRequest) =>
    api.waivers.create(childId, body),
  );
}

export function useUpdateWaiver(): MutationResult<[string, string, UpdateWaiverRequest], Waiver> {
  return useApiMutation((childId: string, id: string, body: UpdateWaiverRequest) =>
    api.waivers.update(childId, id, body),
  );
}
