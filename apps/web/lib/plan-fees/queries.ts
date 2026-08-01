'use client';

import type { PlanFee } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface PlanFeesResult {
  data: PlanFee[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** A Plan's attached Fees, embedded in Plan Detail - the endpoint returns a plain array (not Paginated<T>), so this is a simple full fetch, no query/pagination state at all. */
export function usePlanFees(planId: string): PlanFeesResult {
  const [data, setData] = useState<PlanFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.planFees
      .list(planId)
      .then((result) => {
        if (!cancelled) setData(result);
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
