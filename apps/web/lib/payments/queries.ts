'use client';

import type { Payment } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface GuardianPaymentsResult {
  data: Payment[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Payments recorded against one guardian's account - embedded on Guardian Detail, not URL-driven, same reasoning as useInvoicePayments (a handful of rows for one parent record, not a paginated page of its own). Capped at the API's max page size (100), same documented boundary as every other directory-style hook. */
export function useGuardianPayments(guardianId: string): GuardianPaymentsResult {
  const [data, setData] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.payments
      .list(guardianId, { page: 1, pageSize: 100, sortBy: 'paidAt', sortOrder: 'desc' })
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

export interface AvailableCreditResult {
  data: string | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** A guardian's computed available credit (unallocated payment remainder) - same single-value fetch shape as useGuardian, just backed by a derived figure instead of a stored entity. */
export function useAvailableCredit(guardianId: string): AvailableCreditResult {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.paymentAllocations
      .getAvailableCredit(guardianId)
      .then((result) => {
        if (!cancelled) setData(result.availableCredit);
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
