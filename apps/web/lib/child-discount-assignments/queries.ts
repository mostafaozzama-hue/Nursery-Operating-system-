'use client';

import type { ChildDiscountAssignment } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ChildDiscountAssignmentsResult {
  data: ChildDiscountAssignment[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * A Child's full discount-assignment history, newest-first, embedded in Child Detail - not a full
 * page with its own pagination/sort controls, so this mirrors usePlanPrices's fixed-page-size
 * sub-list shape. A Child's discount-assignment history is expected to stay small over its
 * lifetime.
 */
export function useChildDiscountAssignments(childId: string): ChildDiscountAssignmentsResult {
  const [data, setData] = useState<ChildDiscountAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.childDiscountAssignments
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
