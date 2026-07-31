import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const INVOICE_SORT_FIELDS = ['createdAt', 'totalAmount'] as const;
export type InvoiceSortField = (typeof INVOICE_SORT_FIELDS)[number];

// OVERDUE is never stored - filtering by it is translated in the repository
// into (status IN (ISSUED, PARTIALLY_PAID) AND dueDate < tenant-local today).
export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// The subset of INVOICE_STATUSES an invoice can still receive payment
// against - shared here (not exported from invoice.repository.ts) so
// PaymentAllocationRepository can reuse the same vocabulary without
// depending on another module's repository internals. Deliberately not
// `as const` - used only against the plain `string`-typed Invoice.status
// field (Prisma.InvoiceWhereInput's `in` filter, Array.includes), never as
// a derived literal-union type the way INVOICE_STATUSES/InvoiceStatus is.
export const PAYABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID'];

export class InvoiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  guardianId?: string;

  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ enum: INVOICE_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(INVOICE_SORT_FIELDS)
  sortBy: InvoiceSortField = 'createdAt';
}
