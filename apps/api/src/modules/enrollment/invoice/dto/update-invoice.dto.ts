import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * DRAFT-only, enforced in the repository. status/totalAmount are
 * deliberately absent - always derived, never client-set, matching
 * Enrollment's protected-field discipline.
 */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  billedToGuardianId?: string;

  @ApiPropertyOptional({ example: '2024-09-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
