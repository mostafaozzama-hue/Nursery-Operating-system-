import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const PLAN_PRICE_SORT_FIELDS = ['effectiveFrom', 'amount', 'createdAt'] as const;
export type PlanPriceSortField = (typeof PLAN_PRICE_SORT_FIELDS)[number];

export class PlanPriceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PLAN_PRICE_SORT_FIELDS, default: 'effectiveFrom' })
  @IsOptional()
  @IsIn(PLAN_PRICE_SORT_FIELDS)
  sortBy: PlanPriceSortField = 'effectiveFrom';
}
