'use client';

import type { Fee, FeeSortField, FeeType } from '@nursery-os/contracts';
import { FEE_SORT_FIELDS, FEE_TYPES } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface FeeListQuery {
  page: number;
  pageSize: number;
  search: string;
  type: FeeType | '';
  isActive: boolean | '';
  sortBy: FeeSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: FeeListQuery = {
  page: 1,
  pageSize: 20,
  search: '',
  type: '',
  isActive: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SEARCH_DEBOUNCE_MS = 300;

function readQuery(searchParams: URLSearchParams): FeeListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const type = searchParams.get('type');
  const isActive = searchParams.get('isActive');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    search: searchParams.get('search') ?? DEFAULTS.search,
    type: FEE_TYPES.includes(type as FeeType) ? (type as FeeType) : DEFAULTS.type,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : DEFAULTS.isActive,
    sortBy: FEE_SORT_FIELDS.includes(sortBy as FeeSortField)
      ? (sortBy as FeeSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: FeeListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search) params.set('search', query.search);
  if (query.type !== '') params.set('type', query.type);
  if (query.isActive !== '') params.set('isActive', String(query.isActive));
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface FeeListResult {
  data: Fee[];
  total: number;
  totalPages: number;
  query: FeeListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<FeeListQuery>) => void;
  refetch: () => void;
}

/** Same URL-driven query/pagination/sort/debounced-search shape as usePlanList - no bespoke logic here. */
export function useFeeList(): FeeListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Fee[]>([]);
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

    api.fees
      .list({
        page: query.page,
        pageSize: query.pageSize,
        name: query.search || undefined,
        type: query.type === '' ? undefined : query.type,
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
    query.type,
    query.isActive,
    query.sortBy,
    query.sortOrder,
    reloadToken,
  ]);

  const applyQuery = (next: FeeListQuery) => {
    router.replace(`/dashboard/configuration/fees${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<FeeListQuery>) => {
    const next: FeeListQuery = {
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

export interface FeeResult {
  data: Fee | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that has no id yet). */
export function useFee(id: string | null): FeeResult {
  const [data, setData] = useState<Fee | null>(null);
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

    api.fees
      .get(id)
      .then((fee) => {
        if (!cancelled) setData(fee);
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

export interface FeeSummaryResult {
  total: number;
  activeCount: number;
  isLoading: boolean;
  error: unknown;
}

/** Cheap dashboard signal - a single small-page-size request, not a full directory fetch. Counts come from Paginated.meta.total on two calls (all, active-only), not client-side filtering of a bulk fetch. */
export function useFeeSummary(): FeeSummaryResult {
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.fees.list({ page: 1, pageSize: 1 }),
      api.fees.list({ page: 1, pageSize: 1, isActive: true }),
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

export interface FeeDirectoryResult {
  fees: Fee[];
  byId: Map<string, Fee>;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Flat, non-paginated fetch for picker use (e.g. attaching a Fee to a Plan) - mirrors
 * useClassroomDirectory's shape exactly. Active-only by default: the picker itself is the
 * frontend's own decision not to offer inactive fees for new use, the backend doesn't require it.
 * Pass includeInactive when the consumer needs to resolve a Fee that may since have been
 * deactivated (e.g. displaying a Child's existing fee-assignment history) - deactivating a Fee
 * only blocks new assignments, existing ones stay unaffected, so their display must still resolve.
 */
export function useFeeDirectory(includeInactive = false): FeeDirectoryResult {
  const [fees, setFees] = useState<Fee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.fees
      .list({
        page: 1,
        pageSize: 100,
        isActive: includeInactive ? undefined : true,
        sortBy: 'name',
        sortOrder: 'asc',
      })
      .then((result) => {
        if (!cancelled) setFees(result.data);
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
  }, [includeInactive, reloadToken]);

  const byId = useMemo(() => new Map(fees.map((fee) => [fee.id, fee])), [fees]);

  return { fees, byId, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
