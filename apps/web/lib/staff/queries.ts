'use client';

import type { Staff, StaffSortField } from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface StaffListQuery {
  page: number;
  pageSize: number;
  search: string;
  sortBy: StaffSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: StaffListQuery = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_FIELDS: StaffSortField[] = ['firstName', 'lastName', 'hireDate', 'createdAt'];
const SEARCH_DEBOUNCE_MS = 300;

function readQuery(searchParams: URLSearchParams): StaffListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    search: searchParams.get('search') ?? DEFAULTS.search,
    sortBy: SORT_FIELDS.includes(sortBy as StaffSortField)
      ? (sortBy as StaffSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: StaffListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search) params.set('search', query.search);
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface StaffListResult {
  data: Staff[];
  total: number;
  totalPages: number;
  query: StaffListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<StaffListQuery>) => void;
  refetch: () => void;
}

/** Owns the list's URL-driven query. `search` maps to the backend's `name` filter (first/last name, case-insensitive). */
export function useStaffList(): StaffListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Staff[]>([]);
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

    api.staff
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

  const applyQuery = (next: StaffListQuery) => {
    router.replace(`/dashboard/staff${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<StaffListQuery>) => {
    const next: StaffListQuery = {
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

export interface ClassroomStaffResult {
  data: Staff[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Staff currently assigned to one classroom, embedded on the classroom's detail page. */
export function useClassroomStaff(classroomId: string): ClassroomStaffResult {
  const [data, setData] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.staff
      .list({ classroomId, page: 1, pageSize: 100 })
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
  }, [classroomId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

export interface StaffDirectoryResult {
  staff: Staff[];
  byId: Map<string, Staff>;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Bulk lookup source for resolving staff names in batches (the Payroll
 * staff picker), instead of one request per row. Backed by a single request
 * for up to the API's max page size (100), sorted by name - same documented
 * scaling boundary as useClassroomDirectory/useMembershipDirectory.
 */
export function useStaffDirectory(enabled = true): StaffDirectoryResult {
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStaffMembers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.staff
      .list({ page: 1, pageSize: 100, sortBy: 'firstName', sortOrder: 'asc' })
      .then((result) => {
        if (!cancelled) setStaffMembers(result.data);
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
  }, [enabled, reloadToken]);

  const byId = useMemo(
    () => new Map(staffMembers.map((member) => [member.id, member])),
    [staffMembers],
  );

  return {
    staff: staffMembers,
    byId,
    isLoading,
    error,
    refetch: () => setReloadToken((t) => t + 1),
  };
}

export interface StaffMemberResult {
  data: Staff | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Pass `null` to skip fetching (e.g. a create-mode form that conditionally has no id yet). */
export function useStaffMember(id: string | null): StaffMemberResult {
  const [data, setData] = useState<Staff | null>(null);
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

    api.staff
      .get(id)
      .then((member) => {
        if (!cancelled) setData(member);
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
