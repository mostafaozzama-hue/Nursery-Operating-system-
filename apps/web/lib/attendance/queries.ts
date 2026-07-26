'use client';

import type {
  Attendance,
  AttendanceSortField,
  AttendanceStatus,
  Child,
} from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useChildDirectory } from '@/lib/children/queries';
import { todayLocalDate } from './mapper';

export interface AttendanceListQuery {
  page: number;
  pageSize: number;
  classroomId: string;
  status: AttendanceStatus | '';
  date: string;
  sortBy: AttendanceSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: AttendanceListQuery = {
  page: 1,
  pageSize: 20,
  classroomId: '',
  status: '',
  date: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

const SORT_FIELDS: AttendanceSortField[] = ['date', 'createdAt'];
const STATUSES: AttendanceStatus[] = ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT'];

function readQuery(searchParams: URLSearchParams): AttendanceListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const status = searchParams.get('status');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    classroomId: searchParams.get('classroomId') ?? DEFAULTS.classroomId,
    status: STATUSES.includes(status as AttendanceStatus) ? (status as AttendanceStatus) : '',
    date: searchParams.get('date') ?? DEFAULTS.date,
    sortBy: SORT_FIELDS.includes(sortBy as AttendanceSortField)
      ? (sortBy as AttendanceSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: AttendanceListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.classroomId) params.set('classroomId', query.classroomId);
  if (query.status) params.set('status', query.status);
  if (query.date) params.set('date', query.date);
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface AttendanceListResult {
  data: Attendance[];
  total: number;
  totalPages: number;
  query: AttendanceListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<AttendanceListQuery>) => void;
  refetch: () => void;
}

/** Audit/history list - URL-driven, paginated/filterable/sortable, mirrors useStaffList. */
export function useAttendanceList(): AttendanceListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Attendance[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.attendance
      .list({
        page: query.page,
        pageSize: query.pageSize,
        classroomId: query.classroomId || undefined,
        status: query.status || undefined,
        date: query.date || undefined,
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
    query.classroomId,
    query.status,
    query.date,
    query.sortBy,
    query.sortOrder,
    reloadToken,
  ]);

  const applyQuery = (next: AttendanceListQuery) => {
    router.replace(`/dashboard/attendance/history${toSearchString(next)}`);
  };

  const setQuery = (partial: Partial<AttendanceListQuery>) => {
    const next: AttendanceListQuery = {
      ...query,
      ...partial,
      page: partial.page ?? DEFAULTS.page,
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

export type RosterStatus = 'NOT_YET' | AttendanceStatus;

export interface ClassroomRosterRow {
  child: Child;
  attendance: Attendance | null;
  status: RosterStatus;
}

export interface ClassroomRosterResult {
  rows: ClassroomRosterRow[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Today's classroom-scoped roster (design-system.md §6.2 / feature-map.md
 * MVP) - crosses the classroom's active Enrollment list against today's
 * Attendance records for the same classroom, entirely client-side (no new
 * backend endpoint). `null` classroomId means "no classroom picked yet" and
 * skips fetching, same idiom as useStaffMember(id: string | null).
 */
export function useClassroomRosterToday(classroomId: string | null): ClassroomRosterResult {
  const {
    byId: childrenById,
    isLoading: childrenLoading,
    error: childrenError,
  } = useChildDirectory();
  const [rows, setRows] = useState<ClassroomRosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(classroomId !== null);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (classroomId === null) {
      setRows([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.enrollments.list({ classroomId, open: true, page: 1, pageSize: 100 }),
      api.attendance.list({
        classroomId,
        date: todayLocalDate(),
        page: 1,
        pageSize: 100,
      }),
    ])
      .then(([enrollments, attendanceToday]) => {
        if (cancelled) return;
        const attendanceByChildId = new Map(
          attendanceToday.data.map((record) => [record.childId, record]),
        );
        setRows(
          enrollments.data
            .map((enrollment): ClassroomRosterRow | null => {
              const child = childrenById.get(enrollment.childId);
              if (!child) return null;
              const record = attendanceByChildId.get(enrollment.childId) ?? null;
              return { child, attendance: record, status: record?.status ?? 'NOT_YET' };
            })
            .filter((row): row is ClassroomRosterRow => row !== null),
        );
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
  }, [classroomId, childrenById, reloadToken]);

  return {
    rows,
    isLoading: isLoading || childrenLoading,
    error: error ?? childrenError,
    refetch: () => setReloadToken((t) => t + 1),
  };
}

export interface AttendanceRecordResult {
  data: Attendance | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function useAttendanceRecord(id: string | null): AttendanceRecordResult {
  const [data, setData] = useState<Attendance | null>(null);
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

    api.attendance
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
