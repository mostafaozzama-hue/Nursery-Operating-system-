import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * Owner Dashboard financial snapshot. from/to only bound invoicedAmount
 * (Invoice.createdAt basis) - outstandingAmount/overdueAmount are always
 * as-of-now snapshots and deliberately ignore this range (see
 * InvoiceRepository.getSummary).
 */
export class InvoiceSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'invoicedAmount period start (inclusive), Invoice.createdAt basis' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'invoicedAmount period end (exclusive), Invoice.createdAt basis' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
