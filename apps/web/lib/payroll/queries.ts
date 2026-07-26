'use client';

import type { PayrollSortField, StaffPayroll } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface PayrollListQuery {
  page: number;
  pageSize: number;
  sortBy: PayrollSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: PayrollListQuery = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_FIELDS: PayrollSortField[] = ['effectiveDate', 'createdAt'];

function readQuery(searchParams: URLSearchParams): PayrollListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    sortBy: SORT_FIELDS.includes(sortBy as PayrollSortField)
      ? (sortBy as PayrollSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: PayrollListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface PayrollListResult {
  data: StaffPayroll[];
  total: number;
  totalPages: number;
  query: PayrollListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<PayrollListQuery>) => void;
  refetch: () => void;
}

/**
 * Owns the list's URL-driven query and its fetch. No search box - Payroll has
 * no name-like field of its own to search by; the staff column links out to
 * the profile.
 *
 * `enabled` (default true) lets a STAFF-role page guard skip the fetch
 * entirely - GET /payroll is OWNER/ADMIN-only, and STAFF should never even
 * attempt the request, same as useMembershipDirectory's canManage gating.
 */
export function usePayrollList(enabled = true): PayrollListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<StaffPayroll[]>([]);
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

    api.payroll
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

  const applyQuery = (next: PayrollListQuery) => {
    router.replace(`/dashboard/payroll${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<PayrollListQuery>) => {
    const next: PayrollListQuery = { ...query, ...partial, page: partial.page ?? query.page };
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

export interface PayrollRecordResult {
  data: StaffPayroll | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that conditionally has no id yet). */
export function usePayrollRecord(id: string | null): PayrollRecordResult {
  const [data, setData] = useState<StaffPayroll | null>(null);
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

    api.payroll
      .get(id)
      .then((record) => {
        if (!cancelled) setData(record);
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
