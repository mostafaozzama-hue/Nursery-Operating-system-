import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const CHILD_GUARDIAN_SORT_FIELDS = ['createdAt'] as const;
export type ChildGuardianSortField = (typeof CHILD_GUARDIAN_SORT_FIELDS)[number];

export class ChildGuardianQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  guardianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimaryContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canPickup?: boolean;

  @ApiPropertyOptional({ enum: CHILD_GUARDIAN_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CHILD_GUARDIAN_SORT_FIELDS)
  sortBy: ChildGuardianSortField = 'createdAt';
}
