'use client';

import type {
  Invoice,
  InvoiceLineItem,
  InvoicePaymentAllocation,
  InvoiceSortField,
  InvoiceStatus,
} from '@nursery-os/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface InvoiceListQuery {
  page: number;
  pageSize: number;
  childId: string;
  guardianId: string;
  status: InvoiceStatus | '';
  sortBy: InvoiceSortField;
  sortOrder: 'asc' | 'desc';
}

const DEFAULTS: InvoiceListQuery = {
  page: 1,
  pageSize: 20,
  childId: '',
  guardianId: '',
  status: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_FIELDS: InvoiceSortField[] = ['createdAt', 'totalAmount'];
const STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'];

function readQuery(searchParams: URLSearchParams): InvoiceListQuery {
  const page = Number(searchParams.get('page'));
  const pageSize = Number(searchParams.get('pageSize'));
  const status = searchParams.get('status');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder');

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULTS.pageSize,
    childId: searchParams.get('childId') ?? DEFAULTS.childId,
    guardianId: searchParams.get('guardianId') ?? DEFAULTS.guardianId,
    status: STATUSES.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : '',
    sortBy: SORT_FIELDS.includes(sortBy as InvoiceSortField)
      ? (sortBy as InvoiceSortField)
      : DEFAULTS.sortBy,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULTS.sortOrder,
  };
}

function toSearchString(query: InvoiceListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== DEFAULTS.page) params.set('page', String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.childId) params.set('childId', query.childId);
  if (query.guardianId) params.set('guardianId', query.guardianId);
  if (query.status) params.set('status', query.status);
  if (query.sortBy !== DEFAULTS.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder !== DEFAULTS.sortOrder) params.set('sortOrder', query.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export interface InvoiceListResult {
  data: Invoice[];
  total: number;
  totalPages: number;
  query: InvoiceListQuery;
  isLoading: boolean;
  error: unknown;
  setQuery: (partial: Partial<InvoiceListQuery>) => void;
  refetch: () => void;
}

/** Same URL-driven query/pagination/sort shape as useAttendanceList/useStaffList - no bespoke logic here, this hook is the only thing that varies per module. */
export function useInvoiceList(): InvoiceListResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(searchParams), [searchParams]);

  const [data, setData] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.invoices
      .list({
        page: query.page,
        pageSize: query.pageSize,
        childId: query.childId || undefined,
        guardianId: query.guardianId || undefined,
        status: query.status || undefined,
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
    query.childId,
    query.guardianId,
    query.status,
    query.sortBy,
    query.sortOrder,
    reloadToken,
  ]);

  const setQuery = (partial: Partial<InvoiceListQuery>) => {
    const next: InvoiceListQuery = { ...query, ...partial, page: partial.page ?? DEFAULTS.page };
    router.replace(`/dashboard/invoices${toSearchString(next)}`);
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

export interface InvoiceResult {
  data: Invoice | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function useInvoice(id: string | null): InvoiceResult {
  const [data, setData] = useState<Invoice | null>(null);
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

    api.invoices
      .get(id)
      .then((invoice) => {
        if (!cancelled) setData(invoice);
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

export interface InvoiceLineItemsResult {
  data: InvoiceLineItem[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Line items for one invoice - same shape as useInvoicePayments, backed by the GET /invoices/:id/line-items endpoint added alongside this frontend (no prior way to list an invoice's line items existed). */
export function useInvoiceLineItems(invoiceId: string): InvoiceLineItemsResult {
  const [data, setData] = useState<InvoiceLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.invoices
      .listLineItems(invoiceId, { page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'asc' })
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
  }, [invoiceId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

export interface InvoicesForBillingRunResult {
  data: Invoice[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Invoices generated by one BillingRun, embedded on BillingRunDetail - same reasoning as
 * useInvoiceLineItems/useInvoicePayments (a handful of rows for one parent record, not a paginated
 * page of its own). Pass `null` to skip fetching (e.g. a !canManage caller that never renders the
 * table this feeds) - same convention as useBillingRun/useHoliday's own null-to-skip shape.
 */
export function useInvoicesForBillingRun(billingRunId: string | null): InvoicesForBillingRunResult {
  const [data, setData] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(billingRunId !== null);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (billingRunId === null) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.invoices
      .list({ page: 1, pageSize: 100, billingRunId, sortBy: 'createdAt', sortOrder: 'asc' })
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
  }, [billingRunId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}

export interface InvoicePaymentsResult {
  data: InvoicePaymentAllocation[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Payments applied to one invoice - embedded, not URL-driven, same reasoning as useChildEnrollments (a handful of rows, not pages of them). Read-only, joining through PaymentAllocation - amountApplied is this invoice's own portion of a payment that may span several invoices, not the payment's full amount. Capped at the API's max page size (100), same documented boundary as every other directory-style hook. */
export function useInvoicePayments(invoiceId: string): InvoicePaymentsResult {
  const [data, setData] = useState<InvoicePaymentAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.invoices
      .listPayments(invoiceId, { page: 1, pageSize: 100, sortBy: 'paidAt', sortOrder: 'desc' })
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
  }, [invoiceId, reloadToken]);

  return { data, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
