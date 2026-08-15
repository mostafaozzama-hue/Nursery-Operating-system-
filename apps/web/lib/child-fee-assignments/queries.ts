'use client';

import type { ChildFeeAssignment } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ChildFeeAssignmentsResult {
  data: ChildFeeAssignment[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * A Child's full fee-assignment history, newest-first, embedded in Child Detail - not a full page
 * with its own pagination/sort controls, so this mirrors usePlanPrices's fixed-page-size sub-list
 * shape. A Child's fee-assignment history is expected to stay small over its lifetime.
 */
export function useChildFeeAssignments(childId: string): ChildFeeAssignmentsResult {
  const [data, setData] = useState<ChildFeeAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.childFeeAssignments
      .list(childId, { page: 1, pageSize: 100, sortBy: 'effectiveFrom', sortOrder: 'desc' })
      .then((result) => {
        if (!cancelled) setData(result.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [childId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
