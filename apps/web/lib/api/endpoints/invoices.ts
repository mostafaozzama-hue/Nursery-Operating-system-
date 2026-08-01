import type {
  CreateInvoiceRequest,
  CreateLineItemRequest,
  Invoice,
  InvoiceLineItem,
  InvoicePaymentAllocation,
  InvoiceQuery,
  IssueInvoiceRequest,
  LineItemQuery,
  Paginated,
  PaymentQuery,
  UpdateInvoiceRequest,
  UpdateLineItemRequest,
} from '@nursery-os/contracts';
import { get, patch, post, del } from '../client';

/** No top-level DELETE - invoices are financial history, voided rather than deleted, same reasoning as Enrollment/Attendance. Line items are nested, no independent lifecycle apart from their parent invoice. Payments are recorded guardian-anchored now (see endpoints/payments.ts) - listPayments here is a read-only view joining through PaymentAllocation. */
export const invoices = {
  create: (body: CreateInvoiceRequest) => post<Invoice>('/invoices', body),
  list: (query?: InvoiceQuery) => get<Paginated<Invoice>>('/invoices', query),
  get: (id: string) => get<Invoice>(`/invoices/${id}`),
  update: (id: string, body: UpdateInvoiceRequest) => patch<Invoice>(`/invoices/${id}`, body),
  addLineItem: (invoiceId: string, body: CreateLineItemRequest) =>
    post<InvoiceLineItem>(`/invoices/${invoiceId}/line-items`, body),
  updateLineItem: (invoiceId: string, lineItemId: string, body: UpdateLineItemRequest) =>
    patch<InvoiceLineItem>(`/invoices/${invoiceId}/line-items/${lineItemId}`, body),
  removeLineItem: (invoiceId: string, lineItemId: string) =>
    del<void>(`/invoices/${invoiceId}/line-items/${lineItemId}`),
  listLineItems: (invoiceId: string, query?: LineItemQuery) =>
    get<Paginated<InvoiceLineItem>>(`/invoices/${invoiceId}/line-items`, query),
  issue: (invoiceId: string, body: IssueInvoiceRequest) =>
    post<Invoice>(`/invoices/${invoiceId}/issue`, body),
  listPayments: (invoiceId: string, query?: PaymentQuery) =>
    get<Paginated<InvoicePaymentAllocation>>(`/invoices/${invoiceId}/payments`, query),
  void: (invoiceId: string) => post<Invoice>(`/invoices/${invoiceId}/void`),
};
