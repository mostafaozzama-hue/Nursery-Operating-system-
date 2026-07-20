import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * No status field - the service derives it (classroomId present -> ACTIVE,
 * absent -> WAITLISTED). No start date - enrollment always takes effect
 * immediately; future-dated enrollment is out of scope for the MVP.
 */
export class CreateEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  childId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Omit to enroll as WAITLISTED' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  createdReason?: string;
}
