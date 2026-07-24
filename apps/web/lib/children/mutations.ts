'use client';

import type { Child, CreateChildRequest, UpdateChildRequest } from '@nursery-os/contracts';
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

export function useCreateChild(): MutationResult<[CreateChildRequest], Child> {
  return useApiMutation(api.children.create);
}

export function useUpdateChild(): MutationResult<[string, UpdateChildRequest], Child> {
  return useApiMutation((id: string, body: UpdateChildRequest) => api.children.update(id, body));
}

export function useDeleteChild(): MutationResult<[string], void> {
  return useApiMutation(api.children.remove);
}
