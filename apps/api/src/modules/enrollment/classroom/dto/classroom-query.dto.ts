import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const CLASSROOM_SORT_FIELDS = ['name', 'capacity', 'createdAt'] as const;
export type ClassroomSortField = (typeof CLASSROOM_SORT_FIELDS)[number];

export class ClassroomQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ description: 'Case-insensitive partial match on name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: CLASSROOM_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CLASSROOM_SORT_FIELDS)
  sortBy: ClassroomSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
