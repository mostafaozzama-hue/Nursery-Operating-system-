import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { FEE_TYPES, FeeType } from './fee-type';

export const FEE_SORT_FIELDS = ['name', 'amount', 'type', 'createdAt'] as const;
export type FeeSortField = (typeof FEE_SORT_FIELDS)[number];

export class FeeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: FEE_TYPES })
  @IsOptional()
  @IsIn(FEE_TYPES)
  type?: FeeType;

  @ApiPropertyOptional({ description: 'Filter to only active (true) or inactive (false) fees' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: FEE_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(FEE_SORT_FIELDS)
  sortBy: FeeSortField = 'createdAt';
}
