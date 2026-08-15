import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Max, Min, IsNumber } from 'class-validator';
import { WAIVER_REASON_CODES, WaiverReasonCode } from './waiver-reason-code';

/**
 * Deliberately excludes childId, approvedBy, effectiveFrom, AND type -
 * per explicit instruction, only percentage/reasonCode/reasonNote/
 * effectiveTo/reviewAnnually are editable.
 *
 * The exclusion of `type` specifically is an ENGINEERING INTERPRETATION,
 * not a documented business rule - neither domain-model.md nor
 * configuration-engine-backend-services.md states whether Waiver.type is
 * mutable after creation. It was never named in the explicit allow-list
 * (percentage, reasonCode, reasonNote, effectiveTo, reviewAnnually) or the
 * explicit disallow-list (childId, approvedBy, effectiveFrom) given for
 * this DTO - reading "should allow updating only" as exhaustive is this
 * implementation's own choice, not a frozen-document requirement.
 *
 * approvedBy is excluded for a different, also-inferred reason: it's
 * treated as immutable-after-creation by analogy to Attendance's
 * written-once actor fields, even though Waiver's own schema comment
 * doesn't state this explicitly either.
 */
export class UpdateWaiverDto {
  @ApiPropertyOptional({ example: 50, description: 'Percentage, 0-100' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ enum: WAIVER_REASON_CODES })
  @IsOptional()
  @IsIn(WAIVER_REASON_CODES)
  reasonCode?: WaiverReasonCode;

  @ApiPropertyOptional({ description: 'Required when the resulting reasonCode is OTHER - validated against the merged entity, not just this payload' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonNote?: string;

  @ApiPropertyOptional({ example: '2027-09-01', description: 'Set to null to clear (only valid if reviewAnnually is or becomes true)' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @ApiPropertyOptional({ description: 'Required (true) unless the resulting effectiveTo is set - validated against the merged entity' })
  @IsOptional()
  @IsBoolean()
  reviewAnnually?: boolean;
}
