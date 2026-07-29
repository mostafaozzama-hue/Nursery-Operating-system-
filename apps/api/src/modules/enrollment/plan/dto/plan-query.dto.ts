import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const PLAN_SORT_FIELDS = ['name', 'billingCycle', 'createdAt'] as const;
export type PlanSortField = (typeof PLAN_SORT_FIELDS)[number];

export class PlanQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter to only active (true) or inactive (false) plans' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: PLAN_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PLAN_SORT_FIELDS)
  sortBy: PlanSortField = 'createdAt';
}
