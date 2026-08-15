'use client';

import type { Waiver } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ChildWaiversResult {
  data: Waiver[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** A Child's full waiver history, newest-first, embedded in Child Detail - mirrors useChildFeeAssignments's fixed-page-size sub-list shape. A Child's waiver history is expected to stay small over its lifetime. */
export function useChildWaivers(childId: string): ChildWaiversResult {
  const [data, setData] = useState<Waiver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.waivers
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
