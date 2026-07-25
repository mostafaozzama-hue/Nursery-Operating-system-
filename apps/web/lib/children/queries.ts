'use client';

import type { Child, ChildSortField } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface ChildrenListQuery {
  page: number;
  pageSize: number;
  search: string;
  sortBy: ChildSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: ChildrenListQuery = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_FIELDS: ChildSortField[] = ['firstName', 'lastName', 'dateOfBirth', 'createdAt'];
const SEARCH_DEBOUNCE_MS = 300;

function readQuery(searchParams: URLSearchParams): ChildrenListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    search: searchParams.get('search') ?? DEFAULTS.search,
    sortBy: SORT_FIELDS.includes(sortBy as ChildSortField)
      ? (sortBy as ChildSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: ChildrenListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search) params.set('search', query.search);
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface ChildrenListResult {
  data: Child[];
  total: number;
  totalPages: number;
  query: ChildrenListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<ChildrenListQuery>) => void;
  refetch: () => void;
}

/** Owns the list's URL-driven query (page/pageSize/search/sortBy/sortOrder) and its fetch. */
export function useChildrenList(): ChildrenListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Child[]>([]);
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

    api.children
      .list({
        page: query.page,
        pageSize: query.pageSize,
        name: query.search || undefined,
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
  }, [query.page, query.pageSize, query.search, query.sortBy, query.sortOrder, reloadToken]);

  const applyQuery = (next: ChildrenListQuery) => {
    router.replace(`/dashboard/children${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<ChildrenListQuery>) => {
    const next: ChildrenListQuery = {
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

export interface ChildResult {
  data: Child | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that conditionally has no id yet). */
export function useChild(id: string | null): ChildResult {
  const [data, setData] = useState<Child | null>(null);
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

    api.children
      .get(id)
      .then((child) => {
        if (!cancelled) setData(child);
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

export interface ChildDirectoryResult {
  children: Child[];
  byId: Map<string, Child>;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Bulk lookup source for resolving child names in batches (e.g. child-guardian
 * link rows), instead of one request per row. Backed by a single request for up
 * to the API's max page size (100), sorted by name - covers the first 100
 * children per tenant. There's no `ids`-filter on `GET /children` to do a true
 * targeted batch fetch, so this is a deliberate, documented scaling boundary
 * rather than a full solution for very large tenants.
 */
export function useChildDirectory(): ChildDirectoryResult {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.children
      .list({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' })
      .then((result) => {
        if (!cancelled) setChildren(result.data);
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

  const byId = useMemo(() => new Map(children.map((child) => [child.id, child])), [children]);

  return { children, byId, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
