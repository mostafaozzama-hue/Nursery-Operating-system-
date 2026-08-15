'use client';

import type { AttachPlanFeeRequest, PlanFee } from '@nursery-os/contracts';
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

export function useAttachPlanFee(): MutationResult<[string, AttachPlanFeeRequest], PlanFee> {
  return useApiMutation((planId: string, body: AttachPlanFeeRequest) =>
    api.planFees.attach(planId, body),
  );
}

export function useDetachPlanFee(): MutationResult<[string, string], void> {
  return useApiMutation((planId: string, feeId: string) => api.planFees.detach(planId, feeId));
}
