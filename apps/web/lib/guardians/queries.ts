'use client';

import type { Guardian, GuardianSortField } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface GuardiansListQuery {
  page: number;
  pageSize: number;
  search: string;
  email: string;
  sortBy: GuardianSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: GuardiansListQuery = {
  page: 1,
  pageSize: 20,
  search: '',
  email: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_FIELDS: GuardianSortField[] = ['firstName', 'lastName', 'createdAt'];
const DEBOUNCE_MS = 300;

function readQuery(searchParams: URLSearchParams): GuardiansListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    search: searchParams.get('search') ?? DEFAULTS.search,
    email: searchParams.get('email') ?? DEFAULTS.email,
    sortBy: SORT_FIELDS.includes(sortBy as GuardianSortField)
      ? (sortBy as GuardianSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: GuardiansListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search) params.set('search', query.search);
  if (query.email) params.set('email', query.email);
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface GuardiansListResult {
  data: Guardian[];
  total: number;
  totalPages: number;
  query: GuardiansListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<GuardiansListQuery>) => void;
  refetch: () => void;
}

/** Owns the list's URL-driven query (page/pageSize/search/email/sortBy/sortOrder) and its fetch. */
export function useGuardiansList(): GuardiansListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Guardian[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.guardians
      .list({
        page: query.page,
        pageSize: query.pageSize,
        name: query.search || undefined,
        email: query.email || undefined,
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
    query.email,
    query.sortBy,
    query.sortOrder,
    reloadToken,
  ]);

  const applyQuery = (next: GuardiansListQuery) => {
    router.replace(`/dashboard/guardians${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<GuardiansListQuery>) => {
    const isTextSearchChange = partial.search !== undefined || partial.email !== undefined;
    const next: GuardiansListQuery = {
      ...query,
      ...partial,
      page: partial.page ?? (isTextSearchChange ? DEFAULTS.page : query.page),
    };

    if (isTextSearchChange) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => applyQuery(next), DEBOUNCE_MS);
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

export interface GuardianResult {
  data: Guardian | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that conditionally has no id yet). */
export function useGuardian(id: string | null): GuardianResult {
  const [data, setData] = useState<Guardian | null>(null);
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

    api.guardians
      .get(id)
      .then((guardian) => {
        if (!cancelled) setData(guardian);
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

export interface GuardianDirectoryResult {
  guardians: Guardian[];
  byId: Map<string, Guardian>;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Bulk lookup source for resolving guardian names in batches (e.g. child-guardian
 * link rows), instead of one request per row. Backed by a single request for up
 * to the API's max page size (100), sorted by name - covers the first 100
 * guardians per tenant. There's no `ids`-filter on `GET /guardians` to do a true
 * targeted batch fetch, so this is a deliberate, documented scaling boundary
 * rather than a full solution for very large tenants.
 */
export function useGuardianDirectory(): GuardianDirectoryResult {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.guardians
      .list({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' })
      .then((result) => {
        if (!cancelled) setGuardians(result.data);
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

  const byId = useMemo(
    () => new Map(guardians.map((guardian) => [guardian.id, guardian])),
    [guardians],
  );

  return { guardians, byId, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
