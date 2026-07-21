import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** dueDate here sets/overrides the invoice's due date at issue time if not already set. */
export class IssueInvoiceDto {
  @ApiPropertyOptional({ example: '2024-09-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
