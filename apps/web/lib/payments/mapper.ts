import type { PaymentMethod } from '@nursery-os/contracts';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  INSTAPAY: 'InstaPay',
  WALLET: 'Mobile wallet',
  BANK_TRANSFER: 'Bank transfer',
  CREDIT_DEBIT_CARD: 'Credit/debit card',
  OTHER: 'Other',
};
