import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const PAYMENT_SORT_FIELDS = ['paidAt', 'createdAt'] as const;
export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];

export class PaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PAYMENT_SORT_FIELDS, default: 'paidAt' })
  @IsOptional()
  @IsIn(PAYMENT_SORT_FIELDS)
  sortBy: PaymentSortField = 'paidAt';
}
