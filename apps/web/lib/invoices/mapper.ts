import type { InvoiceStatus } from '@nursery-os/contracts';

export function formatInvoiceDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  VOID: 'Void',
};

export const INVOICE_STATUS_BADGE_VARIANT: Record<
  InvoiceStatus,
  'muted' | 'info' | 'warning' | 'success' | 'destructive'
> = {
  DRAFT: 'muted',
  ISSUED: 'info',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  VOID: 'muted',
};
