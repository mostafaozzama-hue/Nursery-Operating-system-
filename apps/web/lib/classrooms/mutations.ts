'use client';

import type {
  Classroom,
  CreateClassroomRequest,
  UpdateClassroomRequest,
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

export function useCreateClassroom(): MutationResult<[CreateClassroomRequest], Classroom> {
  return useApiMutation(api.classrooms.create);
}

export function useUpdateClassroom(): MutationResult<[string, UpdateClassroomRequest], Classroom> {
  return useApiMutation((id: string, body: UpdateClassroomRequest) =>
    api.classrooms.update(id, body),
  );
}

export function useDeleteClassroom(): MutationResult<[string], void> {
  return useApiMutation(api.classrooms.remove);
}
