'use client';

import type { Holiday, HolidaySortField, HolidayType } from '@nursery-os/contracts';
import { HOLIDAY_SORT_FIELDS, HOLIDAY_TYPES } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface HolidayListQuery {
  page: number;
  pageSize: number;
  /** Exact-match only - HolidayQueryDto has no name/partial-text filter at all, unlike Fee/Discount/Plan. */
  date: string;
  type: HolidayType | '';
  sortBy: HolidaySortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: HolidayListQuery = {
  page: 1,
  pageSize: 20,
  date: '',
  type: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

function readQuery(searchParams: URLSearchParams): HolidayListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const type = searchParams.get('type');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    date: searchParams.get('date') ?? DEFAULTS.date,
    type: HOLIDAY_TYPES.includes(type as HolidayType) ? (type as HolidayType) : DEFAULTS.type,
    sortBy: HOLIDAY_SORT_FIELDS.includes(sortBy as HolidaySortField)
      ? (sortBy as HolidaySortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: HolidayListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.date) params.set('date', query.date);
  if (query.type !== '') params.set('type', query.type);
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface HolidayListResult {
  data: Holiday[];
  total: number;
  totalPages: number;
  query: HolidayListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<HolidayListQuery>) => void;
  refetch: () => void;
}

/** URL-driven query/pagination/sort, same shape as useFeeList - but no debounced text search, since HolidayQueryDto offers only an exact `date` match and a `type` filter, no name/partial-text field at all. */
export function useHolidayList(): HolidayListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Holiday[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.holidays
      .list({
        page: query.page,
        pageSize: query.pageSize,
        date: query.date || undefined,
        type: query.type === '' ? undefined : query.type,
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
    query.date,
    query.type,
    query.sortBy,
    query.sortOrder,
    reloadToken,
  ]);

  const applyQuery = (next: HolidayListQuery) => {
    router.replace(`/dashboard/configuration/holidays${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<HolidayListQuery>) => {
    const next: HolidayListQuery = {
      ...query,
      ...partial,
      page: partial.page ?? (partial.date !== undefined ? DEFAULTS.page : query.page),
    };
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

export interface HolidayResult {
  data: Holiday | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that has no id yet). */
export function useHoliday(id: string | null): HolidayResult {
  const [data, setData] = useState<Holiday | null>(null);
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

    api.holidays
      .get(id)
      .then((holiday) => {
        if (!cancelled) setData(holiday);
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

export interface HolidaySummaryResult {
  total: number;
  isLoading: boolean;
  error: unknown;
}

/** Total-only, unlike useFeeSummary/useDiscountSummary - Holiday has no isActive at all, so there is no active/inactive split to report. A single cheap pageSize:1 request. */
export function useHolidaySummary(): HolidaySummaryResult {
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.holidays
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
  }, []);

  return { total, isLoading, error };
}
