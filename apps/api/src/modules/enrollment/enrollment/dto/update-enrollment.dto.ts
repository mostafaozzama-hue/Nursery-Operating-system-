import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Deliberately not PartialType(CreateEnrollmentDto). classroomId and status
 * changes must go through transfer/withdraw, which enforce capacity, the
 * same-classroom check, and the guarded-update concurrency protection - a
 * generic PATCH must not be able to bypass those rules. This corrects the
 * free-text reason and the purely-informational plannedEndDate (Easy
 * Enrollment, Product Gap H phase 2) - neither is a lifecycle field, so
 * neither needs transfer/withdraw's guardrails.
 */
export class UpdateEnrollmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  createdReason?: string;

  @ApiPropertyOptional({
    description: 'null clears a previously-set plannedEndDate.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string | null;
}
