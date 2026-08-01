import type { Payment, RecordPaymentRequest } from '@nursery-os/contracts';
import { post } from '../client';

/** Guardian-anchored - the canonical payment recording path. Moves off /invoices/:invoiceId/payments, which is now InvoiceController's read-only view joining through PaymentAllocation. */
export const payments = {
  record: (guardianId: string, body: RecordPaymentRequest) =>
    post<Payment>(`/guardians/${guardianId}/payments`, body),
};
