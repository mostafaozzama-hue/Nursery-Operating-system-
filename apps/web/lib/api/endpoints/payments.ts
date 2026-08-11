import type { Paginated, Payment, PaymentQuery, RecordPaymentRequest } from '@nursery-os/contracts';
import { get, post } from '../client';

/**
 * Guardian-anchored - the canonical payment recording path. Moves off
 * /invoices/:invoiceId/payments, which is now InvoiceController's read-only
 * view joining through PaymentAllocation. list() reuses PaymentQuery from
 * invoices/types.ts (paidAt/createdAt sort over pagination) rather than
 * declaring a second, identically-shaped query type here - the guardian-
 * anchored GET /guardians/:guardianId/payments backend route sorts by the
 * same two fields.
 */
export const payments = {
  record: (guardianId: string, body: RecordPaymentRequest) =>
    post<Payment>(`/guardians/${guardianId}/payments`, body),
  list: (guardianId: string, query?: PaymentQuery) =>
    get<Paginated<Payment>>(`/guardians/${guardianId}/payments`, query),
};
