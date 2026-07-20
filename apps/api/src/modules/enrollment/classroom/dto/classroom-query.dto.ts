import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const CLASSROOM_SORT_FIELDS = ['name', 'capacity', 'createdAt'] as const;
export type ClassroomSortField = (typeof CLASSROOM_SORT_FIELDS)[number];

export class ClassroomQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: CLASSROOM_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CLASSROOM_SORT_FIELDS)
  sortBy: ClassroomSortField = 'createdAt';
}
