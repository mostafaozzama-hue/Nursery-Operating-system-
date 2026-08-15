import type { PaymentMethod } from '@nursery-os/contracts';

/** paidAt carries a time-of-day component (unlike the @db.Date fields elsewhere), but every other domain's list/detail views only ever show the date portion - same convention followed here. */
export function formatPaymentDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  INSTAPAY: 'InstaPay',
  WALLET: 'Mobile wallet',
  BANK_TRANSFER: 'Bank transfer',
  CREDIT_DEBIT_CARD: 'Credit/debit card',
  OTHER: 'Other',
};
