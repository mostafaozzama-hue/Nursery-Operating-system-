import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Owner Dashboard financial snapshot. Payment.paidAt basis - cash-collected date, not any invoice date. */
export class PaymentSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'Period start (inclusive), Payment.paidAt basis' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Period end (exclusive), Payment.paidAt basis' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
