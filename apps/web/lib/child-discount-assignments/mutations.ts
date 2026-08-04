'use client';

import type {
  AssignChildDiscountRequest,
  ChildDiscountAssignment,
  ExpireChildDiscountRequest,
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

export function useAssignChildDiscount(): MutationResult<
  [string, string, AssignChildDiscountRequest],
  ChildDiscountAssignment
> {
  return useApiMutation((childId: string, discountId: string, body: AssignChildDiscountRequest) =>
    api.childDiscountAssignments.assign(childId, discountId, body),
  );
}

export function useExpireChildDiscount(): MutationResult<
  [string, string, ExpireChildDiscountRequest],
  void
> {
  return useApiMutation((childId: string, discountId: string, body: ExpireChildDiscountRequest) =>
    api.childDiscountAssignments.expire(childId, discountId, body),
  );
}
