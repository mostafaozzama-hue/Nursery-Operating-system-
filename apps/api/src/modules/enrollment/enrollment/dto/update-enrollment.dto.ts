import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Deliberately not PartialType(CreateEnrollmentDto). classroomId and status
 * changes must go through transfer/withdraw, which enforce capacity, the
 * same-classroom check, and the guarded-update concurrency protection - a
 * generic PATCH must not be able to bypass those rules. This only corrects
 * the free-text reason.
 */
export class UpdateEnrollmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  createdReason?: string;
}
