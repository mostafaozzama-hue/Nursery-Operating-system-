'use client';

import type { Plan, PlanSortField } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface PlanListQuery {
  page: number;
  pageSize: number;
  search: string;
  isActive: boolean | '';
  sortBy: PlanSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: PlanListQuery = {
  page: 1,
  pageSize: 20,
  search: '',
  isActive: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_FIELDS: PlanSortField[] = ['name', 'billingCycle', 'createdAt'];
const SEARCH_DEBOUNCE_MS = 300;

function readQuery(searchParams: URLSearchParams): PlanListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const isActive = searchParams.get('isActive');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    search: searchParams.get('search') ?? DEFAULTS.search,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : DEFAULTS.isActive,
    sortBy: SORT_FIELDS.includes(sortBy as PlanSortField)
      ? (sortBy as PlanSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: PlanListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search) params.set('search', query.search);
  if (query.isActive !== '') params.set('isActive', String(query.isActive));
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface PlanListResult {
  data: Plan[];
  total: number;
  totalPages: number;
  query: PlanListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<PlanListQuery>) => void;
  refetch: () => void;
}

/** Same URL-driven query/pagination/sort/debounced-search shape as useClassroomsList - no bespoke logic here. */
export function usePlanList(): PlanListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.plans
      .list({
        page: query.page,
        pageSize: query.pageSize,
        name: query.search || undefined,
        isActive: query.isActive === '' ? undefined : query.isActive,
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
  }, [
    query.page,
    query.pageSize,
    query.search,
    query.isActive,
    query.sortBy,
    query.sortOrder,
    reloadToken,
  ]);

  const applyQuery = (next: PlanListQuery) => {
    router.replace(`/dashboard/configuration/plans${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<PlanListQuery>) => {
    const next: PlanListQuery = {
      ...query,
      ...partial,
      page: partial.page ?? (partial.search !== undefined ? DEFAULTS.page : query.page),
    };

    if (partial.search !== undefined) {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => applyQuery(next), SEARCH_DEBOUNCE_MS);
      return;
    }

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

export interface PlanResult {
  data: Plan | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that has no id yet). */
export function usePlan(id: string | null): PlanResult {
  const [data, setData] = useState<Plan | null>(null);
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

    api.plans
      .get(id)
      .then((plan) => {
        if (!cancelled) setData(plan);
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

export interface PlanSummaryResult {
  total: number;
  activeCount: number;
  isLoading: boolean;
  error: unknown;
}

/** Cheap dashboard signal - a single small-page-size request, not a full directory fetch. Counts come from Paginated.meta.total on two calls (all, active-only), not client-side filtering of a bulk fetch. */
export function usePlanSummary(): PlanSummaryResult {
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.plans.list({ page: 1, pageSize: 1 }),
      api.plans.list({ page: 1, pageSize: 1, isActive: true }),
    ])
      .then(([all, active]) => {
        if (cancelled) return;
        setTotal(all.meta.total);
        setActiveCount(active.meta.total);
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
  }, []);

  return { total, activeCount, isLoading, error };
}
