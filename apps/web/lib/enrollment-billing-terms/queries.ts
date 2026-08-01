'use client';

import type { EnrollmentBillingTerms } from '@nursery-os/contracts';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { isApiError } from '@/lib/api/errors';

export interface EnrollmentBillingTermsResult {
  data: EnrollmentBillingTerms | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Pass `null` to skip fetching (e.g. no current enrollment). Billing terms
 * are opt-in - an enrollment can genuinely have none yet, whether they were
 * skipped at creation or never set since - so a 404 here is a valid,
 * expected state ("no billing terms set yet"), not an error to surface,
 * unlike every other 404 in this app.
 */
export function useEnrollmentBillingTerms(
  enrollmentId: string | null,
): EnrollmentBillingTermsResult {
  const [data, setData] = useState<EnrollmentBillingTerms | null>(null);
  const [isLoading, setIsLoading] = useState(enrollmentId !== null);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (enrollmentId === null) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.enrollmentBillingTerms
      .get(enrollmentId)
      .then((terms) => {
        if (!cancelled) setData(terms);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isApiError(err) && err.statusCode === 404) {
          setData(null);
          return;
        }
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enrollmentId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
