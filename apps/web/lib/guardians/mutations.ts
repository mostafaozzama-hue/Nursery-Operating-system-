'use client';

import type { CreateGuardianRequest, Guardian, UpdateGuardianRequest } from '@nursery-os/contracts';
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

export function useCreateGuardian(): MutationResult<[CreateGuardianRequest], Guardian> {
  return useApiMutation(api.guardians.create);
}

export function useUpdateGuardian(): MutationResult<[string, UpdateGuardianRequest], Guardian> {
  return useApiMutation((id: string, body: UpdateGuardianRequest) =>
    api.guardians.update(id, body),
  );
}

export function useDeleteGuardian(): MutationResult<[string], void> {
  return useApiMutation(api.guardians.remove);
}
