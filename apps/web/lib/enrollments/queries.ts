'use client';

import type { Enrollment } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ChildEnrollmentsResult {
  data: Enrollment[];
  current: Enrollment | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Full enrollment history for one child, embedded on the child's detail page -
 * not URL-driven, same as useChildGuardians from Task 12.3, since a child is
 * expected to have a handful of enrollment rows over time, not pages of them.
 * `current` is derived client-side from this same list (the row with a null
 * endDate) rather than a second request - at most one is ever open per child.
 */
export function useChildEnrollments(childId: string): ChildEnrollmentsResult {
  const [data, setData] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.enrollments
      .list({ childId, page: 1, pageSize: 100, sortBy: 'startDate', sortOrder: 'desc' })
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
  }, [childId, reloadToken]);

  const current = data.find((enrollment) => enrollment.endDate === null) ?? null;

  return { data, current, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

export interface ClassroomEnrollmentsResult {
  data: Enrollment[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Children currently assigned to one classroom, embedded on the classroom's
 * detail page - mirrors useChildEnrollments' shape. Every enrollment row with
 * a non-null classroomId is always status ACTIVE per the backend's create/
 * transfer logic, so `open: true` alone is sufficient to mean "currently here".
 */
export function useClassroomEnrollments(classroomId: string): ClassroomEnrollmentsResult {
  const [data, setData] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.enrollments
      .list({ classroomId, open: true, page: 1, pageSize: 100 })
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

export interface EnrollmentResult {
  data: Enrollment | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Single enrollment record, used to prefill the transfer/withdraw/edit-reason forms. */
export function useEnrollment(id: string | null): EnrollmentResult {
  const [data, setData] = useState<Enrollment | null>(null);
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

    api.enrollments
      .get(id)
      .then((enrollment) => {
        if (!cancelled) setData(enrollment);
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
