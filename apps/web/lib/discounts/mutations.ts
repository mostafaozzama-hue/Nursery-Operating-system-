'use client';

import type { CreateDiscountRequest, Discount, UpdateDiscountRequest } from '@nursery-os/contracts';
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

export function useCreateDiscount(): MutationResult<[CreateDiscountRequest], Discount> {
  return useApiMutation(api.discounts.create);
}

export function useUpdateDiscount(): MutationResult<[string, UpdateDiscountRequest], Discount> {
  return useApiMutation((id: string, body: UpdateDiscountRequest) =>
    api.discounts.update(id, body),
  );
}

export function useActivateDiscount(): MutationResult<[string], Discount> {
  return useApiMutation(api.discounts.activate);
}

export function useDeactivateDiscount(): MutationResult<[string], Discount> {
  return useApiMutation(api.discounts.deactivate);
}
