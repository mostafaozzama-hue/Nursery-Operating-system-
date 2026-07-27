import type { PaginationQuery } from '../common/pagination';

export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceSortField = 'createdAt' | 'totalAmount';

export const PAYMENT_METHODS = [
  'CASH',
  'VODAFONE_CASH',
  'INSTAPAY',
  'BANK_TRANSFER',
  'CARD',
  'CHECK',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentSortField = 'paidAt' | 'createdAt';

export interface Invoice {
  id: string;
  childId: string;
  billedToGuardianId: string;
  status: InvoiceStatus;
  totalAmount: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceQuery extends PaginationQuery {
  childId?: string;
  guardianId?: string;
  status?: InvoiceStatus;
  sortBy?: InvoiceSortField;
}

export interface PaymentQuery extends PaginationQuery {
  sortBy?: PaymentSortField;
}

export type LineItemSortField = 'createdAt' | 'totalAmount';

export interface LineItemQuery extends PaginationQuery {
  sortBy?: LineItemSortField;
}

export interface CreateLineItemRequest {
  description: string;
  quantity: number;
  unitAmount: number;
}

export interface CreateInvoiceRequest {
  childId: string;
  billedToGuardianId: string;
  dueDate?: string;
  lineItems?: CreateLineItemRequest[];
}

export interface UpdateInvoiceRequest {
  childId?: string;
  billedToGuardianId?: string;
  dueDate?: string;
}

export type UpdateLineItemRequest = Partial<CreateLineItemRequest>;

export interface IssueInvoiceRequest {
  dueDate?: string;
}

export interface RecordPaymentRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt?: string;
}
