'use client';

import type {
  CreateEnrollmentRequest,
  Enrollment,
  TransferEnrollmentRequest,
  UpdateEnrollmentRequest,
  WithdrawEnrollmentRequest,
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

export function useCreateEnrollment(): MutationResult<[CreateEnrollmentRequest], Enrollment> {
  return useApiMutation(api.enrollments.create);
}

export function useUpdateEnrollmentReason(): MutationResult<
  [string, UpdateEnrollmentRequest],
  Enrollment
> {
  return useApiMutation((id: string, body: UpdateEnrollmentRequest) =>
    api.enrollments.update(id, body),
  );
}

export function useTransferEnrollment(): MutationResult<
  [string, TransferEnrollmentRequest],
  Enrollment
> {
  return useApiMutation((id: string, body: TransferEnrollmentRequest) =>
    api.enrollments.transfer(id, body),
  );
}

export function useWithdrawEnrollment(): MutationResult<
  [string, WithdrawEnrollmentRequest],
  Enrollment
> {
  return useApiMutation((id: string, body: WithdrawEnrollmentRequest) =>
    api.enrollments.withdraw(id, body),
  );
}
