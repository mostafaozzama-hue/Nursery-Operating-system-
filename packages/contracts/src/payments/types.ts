// Guardian-anchored - Payment is recorded against a Guardian (the billing
// party), not directly against one Invoice. Moved here from invoices/types.ts
// alongside the backend's own PaymentService/PaymentModule split.
export const PAYMENT_METHODS = [
  'CASH',
  'INSTAPAY',
  'WALLET',
  'BANK_TRANSFER',
  'CREDIT_DEBIT_CARD',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  id: string;
  guardianId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt?: string;
}

/** Owner Dashboard financial snapshot. Payment.paidAt basis - cash-collected date. */
export interface PaymentSummaryQuery {
  from?: string;
  to?: string;
}

export interface PaymentSummary {
  collectedAmount: string;
}
