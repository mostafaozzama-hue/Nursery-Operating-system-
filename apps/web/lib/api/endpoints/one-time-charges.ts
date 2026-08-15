import type { AddOneTimeChargeRequest, InvoiceLineItem } from '@nursery-os/contracts';
import { post } from '../client';

/** Only route this service has - reads go through the existing GET /invoices/:invoiceId/line-items (apps/web/lib/api/endpoints/invoices.ts's listLineItems), unchanged. */
export const oneTimeCharges = {
  add: (invoiceId: string, body: AddOneTimeChargeRequest) =>
    post<InvoiceLineItem>(`/invoices/${invoiceId}/one-time-charges`, body),
};
