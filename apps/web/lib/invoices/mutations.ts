'use client';

import type {
  CreateInvoiceRequest,
  CreateLineItemRequest,
  Invoice,
  InvoiceLineItem,
  IssueInvoiceRequest,
  Payment,
  RecordPaymentRequest,
  UpdateInvoiceRequest,
  UpdateLineItemRequest,
} from '@nursery-os/contracts';
import { useState } from 'react';
import { api } from '@/lib/api';

interface MutationResult<TArgs extends unknown[], TResult> {
  mutate: (...args: TArgs) => Promise<TResult>;
  isPending: boolean;
  error: unknown;
}

function useApiMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): MutationResult<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const mutate = async (...args: TArgs) => {
    setIsPending(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, error };
}

export function useCreateInvoice(): MutationResult<[CreateInvoiceRequest], Invoice> {
  return useApiMutation(api.invoices.create);
}

export function useUpdateInvoice(): MutationResult<[string, UpdateInvoiceRequest], Invoice> {
  return useApiMutation((id: string, body: UpdateInvoiceRequest) => api.invoices.update(id, body));
}

export function useAddLineItem(): MutationResult<[string, CreateLineItemRequest], InvoiceLineItem> {
  return useApiMutation((invoiceId: string, body: CreateLineItemRequest) =>
    api.invoices.addLineItem(invoiceId, body),
  );
}

export function useUpdateLineItem(): MutationResult<
  [string, string, UpdateLineItemRequest],
  InvoiceLineItem
> {
  return useApiMutation((invoiceId: string, lineItemId: string, body: UpdateLineItemRequest) =>
    api.invoices.updateLineItem(invoiceId, lineItemId, body),
  );
}

export function useRemoveLineItem(): MutationResult<[string, string], void> {
  return useApiMutation((invoiceId: string, lineItemId: string) =>
    api.invoices.removeLineItem(invoiceId, lineItemId),
  );
}

export function useIssueInvoice(): MutationResult<[string, IssueInvoiceRequest], Invoice> {
  return useApiMutation((invoiceId: string, body: IssueInvoiceRequest) =>
    api.invoices.issue(invoiceId, body),
  );
}

export function useRecordPayment(): MutationResult<[string, RecordPaymentRequest], Payment> {
  return useApiMutation((invoiceId: string, body: RecordPaymentRequest) =>
    api.invoices.recordPayment(invoiceId, body),
  );
}

export function useVoidInvoice(): MutationResult<[string], Invoice> {
  return useApiMutation(api.invoices.void);
}
