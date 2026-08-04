'use client';

import type { BillingRun, BillingRunSortField } from '@nursery-os/contracts';
import { BILLING_RUN_SORT_FIELDS } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface BillingRunListQuery {
  page: number;
  pageSize: number;
  sortBy: BillingRunSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: BillingRunListQuery = {
  page: 1,
  pageSize: 20,
  sortBy: 'runAt',
  sortOrder: 'desc',
};

function readQuery(searchParams: URLSearchParams): BillingRunListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    sortBy: BILLING_RUN_SORT_FIELDS.includes(sortBy as BillingRunSortField)
      ? (sortBy as BillingRunSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: BillingRunListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface BillingRunListResult {
  data: BillingRun[];
  total: number;
  totalPages: number;
  query: BillingRunListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<BillingRunListQuery>) => void;
  refetch: () => void;
}

/**
 * URL-driven query/pagination/sort, same shape as useHolidayList - no filters at all, since
 * BillingRunQueryDto offers only pagination/sort. `enabled` (default true) lets the page skip the
 * fetch entirely for STAFF - GET /billing-runs is OWNER/ADMIN-only, same convention as
 * usePayrollList's own `enabled` gate.
 */
export function useBillingRunList(enabled = true): BillingRunListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<BillingRun[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setTotal(0);
      setTotalPages(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.billingRuns
      .list({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      })
      .then((result) => {
        if (cancelled) return;
        setData(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
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
  }, [enabled, query.page, query.pageSize, query.sortBy, query.sortOrder, reloadToken]);

  const applyQuery = (next: BillingRunListQuery) => {
    router.replace(`/dashboard/configuration/billing-runs${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<BillingRunListQuery>) => {
    const next: BillingRunListQuery = { ...query, ...partial, page: partial.page ?? query.page };
    applyQuery(next);
  };

  return {
    data,
    total,
    totalPages,
    query,
    isLoading,
    error,
    setQuery,
    refetch: () => setReloadToken((t) => t + 1),
  };
}

export interface BillingRunResult {
  data: BillingRun | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. when the caller isn't canManage). */
export function useBillingRun(id: string | null): BillingRunResult {
  const [data, setData] = useState<BillingRun | null>(null);
  const [isLoading, setIsLoading] = useState(id !== null);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (id === null) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.billingRuns
      .get(id)
      .then((billingRun) => {
        if (!cancelled) setData(billingRun);
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
  }, [id, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

export interface BillingRunSummaryResult {
  total: number;
  isLoading: boolean;
  error: unknown;
}

/** Total-only, matching useHolidaySummary's shape - a single cheap pageSize:1 request. `enabled` gates the fetch for STAFF, same as useBillingRunList. */
export function useBillingRunSummary(enabled = true): BillingRunSummaryResult {
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!enabled) {
      setTotal(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.billingRuns
      .list({ page: 1, pageSize: 1 })
      .then((result) => {
        if (!cancelled) setTotal(result.meta.total);
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
  }, [enabled]);

  return { total, isLoading, error };
}
