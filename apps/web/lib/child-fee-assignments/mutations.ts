'use client';

import type {
  AssignChildFeeRequest,
  ChildFeeAssignment,
  UnassignChildFeeRequest,
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

export function useAssignChildFee(): MutationResult<
  [string, AssignChildFeeRequest],
  ChildFeeAssignment
> {
  return useApiMutation((childId: string, body: AssignChildFeeRequest) =>
    api.childFeeAssignments.assign(childId, body),
  );
}

export function useUnassignChildFee(): MutationResult<
  [string, string, UnassignChildFeeRequest],
  void
> {
  return useApiMutation((childId: string, feeId: string, body: UnassignChildFeeRequest) =>
    api.childFeeAssignments.unassign(childId, feeId, body),
  );
}
