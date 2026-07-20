import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const GUARDIAN_SORT_FIELDS = ['firstName', 'lastName', 'createdAt'] as const;
export type GuardianSortField = (typeof GUARDIAN_SORT_FIELDS)[number];

export class GuardianQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on first or last name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive partial match on email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ enum: GUARDIAN_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(GUARDIAN_SORT_FIELDS)
  sortBy: GuardianSortField = 'createdAt';
}
