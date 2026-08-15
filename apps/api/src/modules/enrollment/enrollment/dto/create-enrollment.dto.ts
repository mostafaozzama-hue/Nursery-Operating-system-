import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { OpenBillingTermsDto } from '../../enrollment-billing-terms/dto/open-billing-terms.dto';

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

  @ApiPropertyOptional({
    type: OpenBillingTermsDto,
    description: 'Optional - omit to enroll without billing terms yet',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenBillingTermsDto)
  billingTerms?: OpenBillingTermsDto;
}
