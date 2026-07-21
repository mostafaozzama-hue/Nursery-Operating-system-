import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const INVOICE_SORT_FIELDS = ['createdAt', 'totalAmount'] as const;
export type InvoiceSortField = (typeof INVOICE_SORT_FIELDS)[number];

// OVERDUE is never stored - filtering by it is translated in the repository
// into (status IN (ISSUED, PARTIALLY_PAID) AND dueDate < tenant-local today).
export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

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
