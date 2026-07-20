import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const ENROLLMENT_SORT_FIELDS = ['startDate', 'endDate', 'createdAt'] as const;
export type EnrollmentSortField = (typeof ENROLLMENT_SORT_FIELDS)[number];

export const ENROLLMENT_STATUSES = ['WAITLISTED', 'ACTIVE', 'WITHDRAWN'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export class EnrollmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ enum: ENROLLMENT_STATUSES })
  @IsOptional()
  @IsIn(ENROLLMENT_STATUSES)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ description: 'Filter to only currently-open enrollments (endDate IS NULL)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  open?: boolean;

  @ApiPropertyOptional({ enum: ENROLLMENT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ENROLLMENT_SORT_FIELDS)
  sortBy: EnrollmentSortField = 'createdAt';
}
