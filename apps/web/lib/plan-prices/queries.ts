'use client';

import type { PlanPrice } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface PlanPricesResult {
  data: PlanPrice[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * A Plan's full price history, newest-first, embedded in Plan Detail - not
 * a full page with its own pagination/sort controls, so this mirrors
 * useClassroomEnrollments's fixed-page-size sub-list shape, not
 * usePlanList's URL-driven one. A Plan's price history is expected to stay
 * small over its lifetime.
 */
export function usePlanPrices(planId: string): PlanPricesResult {
  const [data, setData] = useState<PlanPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.planPrices
      .list(planId, { page: 1, pageSize: 100, sortBy: 'effectiveFrom', sortOrder: 'desc' })
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
  }, [planId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
