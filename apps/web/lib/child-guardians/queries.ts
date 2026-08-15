'use client';

import type { ChildGuardian } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ChildGuardianLinksResult {
  data: ChildGuardian[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Links for one child, embedded in the child's detail page - not URL-driven
 * like the top-level list pages, since a child is expected to have a handful
 * of guardians, not pages of them.
 */
export function useChildGuardians(childId: string): ChildGuardianLinksResult {
  const [data, setData] = useState<ChildGuardian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.childGuardians
      .list({ childId, page: 1, pageSize: 100 })
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

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

/** Links for one guardian, embedded in the guardian's detail page. Mirrors useChildGuardians. */
export function useGuardianChildren(guardianId: string): ChildGuardianLinksResult {
  const [data, setData] = useState<ChildGuardian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.childGuardians
      .list({ guardianId, page: 1, pageSize: 100 })
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
  }, [guardianId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

export interface ChildGuardianResult {
  data: ChildGuardian | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Single link, used to prefill the edit-relationship form. */
export function useChildGuardian(id: string | null): ChildGuardianResult {
  const [data, setData] = useState<ChildGuardian | null>(null);
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

    api.childGuardians
      .get(id)
      .then((link) => {
        if (!cancelled) setData(link);
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
