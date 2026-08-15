'use client';

import type {
  ChildGuardian,
  CreateChildGuardianRequest,
  UpdateChildGuardianRequest,
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

export function useLinkGuardian(): MutationResult<[CreateChildGuardianRequest], ChildGuardian> {
  return useApiMutation(api.childGuardians.create);
}

export function useUpdateChildGuardianLink(): MutationResult<
  [string, UpdateChildGuardianRequest],
  ChildGuardian
> {
  return useApiMutation((id: string, body: UpdateChildGuardianRequest) =>
    api.childGuardians.update(id, body),
  );
}

export function useUnlinkGuardian(): MutationResult<[string], void> {
  return useApiMutation(api.childGuardians.remove);
}
