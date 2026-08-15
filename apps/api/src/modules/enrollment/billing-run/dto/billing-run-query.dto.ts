import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const BILLING_RUN_SORT_FIELDS = ['periodStart', 'runAt', 'createdAt'] as const;
export type BillingRunSortField = (typeof BILLING_RUN_SORT_FIELDS)[number];

export class BillingRunQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BILLING_RUN_SORT_FIELDS, default: 'runAt' })
  @IsOptional()
  @IsIn(BILLING_RUN_SORT_FIELDS)
  sortBy: BillingRunSortField = 'runAt';
}
