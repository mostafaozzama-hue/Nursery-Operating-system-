import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { DISCOUNT_TYPES, DiscountType } from './discount-type';

export const DISCOUNT_SORT_FIELDS = ['name', 'amount', 'type', 'createdAt'] as const;
export type DiscountSortField = (typeof DISCOUNT_SORT_FIELDS)[number];

export class DiscountQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  type?: DiscountType;

  @ApiPropertyOptional({ description: 'Filter to only active (true) or inactive (false) discounts' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: DISCOUNT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(DISCOUNT_SORT_FIELDS)
  sortBy: DiscountSortField = 'createdAt';
}
