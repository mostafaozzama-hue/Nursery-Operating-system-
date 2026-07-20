import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const CHILD_SORT_FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'createdAt'] as const;
export type ChildSortField = (typeof CHILD_SORT_FIELDS)[number];

export class ChildQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on first or last name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: CHILD_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CHILD_SORT_FIELDS)
  sortBy: ChildSortField = 'createdAt';
}
