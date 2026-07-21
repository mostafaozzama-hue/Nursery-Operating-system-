import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const ATTENDANCE_SORT_FIELDS = ['date', 'createdAt'] as const;
export type AttendanceSortField = (typeof ATTENDANCE_SORT_FIELDS)[number];

export const ATTENDANCE_STATUSES = ['CHECKED_IN', 'CHECKED_OUT', 'ABSENT'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export class AttendanceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: ATTENDANCE_STATUSES })
  @IsOptional()
  @IsIn(ATTENDANCE_STATUSES)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ enum: ATTENDANCE_SORT_FIELDS, default: 'date' })
  @IsOptional()
  @IsIn(ATTENDANCE_SORT_FIELDS)
  sortBy: AttendanceSortField = 'date';
}
