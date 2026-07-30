import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const SIBLING_DISCOUNT_TIER_SORT_FIELDS = [
  'effectiveFrom',
  'siblingCountThreshold',
  'discountPercentage',
  'createdAt',
] as const;
export type SiblingDiscountTierSortField = (typeof SIBLING_DISCOUNT_TIER_SORT_FIELDS)[number];

export class SiblingDiscountTierQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SIBLING_DISCOUNT_TIER_SORT_FIELDS, default: 'effectiveFrom' })
  @IsOptional()
  @IsIn(SIBLING_DISCOUNT_TIER_SORT_FIELDS)
  sortBy: SiblingDiscountTierSortField = 'effectiveFrom';
}
