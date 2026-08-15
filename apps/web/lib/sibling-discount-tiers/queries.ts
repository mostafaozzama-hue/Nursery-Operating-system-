'use client';

import type { SiblingDiscountTier } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface SiblingDiscountTiersResult {
  data: SiblingDiscountTier[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * A flat, fixed-page-size fetch (no URL-driven pagination/sort), mirroring usePlanPrices's
 * embedded-sub-list shape - a tenant is expected to have very few thresholds, so this is a
 * standalone page reading the full history at once, not a paginated list.
 */
export function useSiblingDiscountTiers(): SiblingDiscountTiersResult {
  const [data, setData] = useState<SiblingDiscountTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.siblingDiscountTiers
      .list({ page: 1, pageSize: 100, sortBy: 'effectiveFrom', sortOrder: 'desc' })
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
  }, [reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
