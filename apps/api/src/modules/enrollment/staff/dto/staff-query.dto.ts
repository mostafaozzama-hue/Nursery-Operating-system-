import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const STAFF_SORT_FIELDS = ['firstName', 'lastName', 'hireDate', 'createdAt'] as const;
export type StaffSortField = (typeof STAFF_SORT_FIELDS)[number];

export class StaffQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive partial match on first or last name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive partial match on position' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ enum: STAFF_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(STAFF_SORT_FIELDS)
  sortBy: StaffSortField = 'createdAt';
}
