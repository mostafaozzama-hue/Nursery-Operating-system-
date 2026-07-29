import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { DEPOSIT_REFUND_POLICIES, DepositRefundPolicy } from './deposit-refund-policy';
import { MANUAL_OVERRIDE_REASON_CODES, ManualOverrideReasonCode } from './manual-override-reason-code';

/**
 * A Plan/rate change closes the current Enrollment+EnrollmentBillingTerms
 * pair and opens a new one (domain-model.md's Entity Reference) - there is
 * no in-place field update. effectiveFrom becomes the new pair's
 * Enrollment.startDate (and the old pair's Enrollment.endDate);
 * EnrollmentBillingTerms itself has no effectiveFrom/effectiveTo column of
 * its own. immediate=false (the default) requires effectiveFrom to be
 * strictly in the future - the standard, non-disruptive path. immediate=true
 * permits any date (including today or backdated corrections) but requires
 * reasonCode and records a PLAN_CHANGE_IMMEDIATE ManualOverride.
 */
export class ChangeBillingTermsDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;

  @ApiPropertyOptional({ enum: MANUAL_OVERRIDE_REASON_CODES, description: 'Required when immediate=true' })
  @ValidateIf((dto: ChangeBillingTermsDto) => dto.immediate === true)
  @IsIn(MANUAL_OVERRIDE_REASON_CODES)
  reasonCode?: ManualOverrideReasonCode;

  @ApiPropertyOptional({ description: 'Required when reasonCode=OTHER' })
  @ValidateIf((dto: ChangeBillingTermsDto) => dto.reasonCode === 'OTHER')
  @IsString()
  reasonNote?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  billingGuardianId?: string;

  @ApiPropertyOptional({ example: 4500.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  customRateAmount?: number;

  @ApiPropertyOptional({ description: 'Required when customRateAmount is set' })
  @ValidateIf((dto: ChangeBillingTermsDto) => dto.customRateAmount !== undefined)
  @IsString()
  customRateReason?: string;

  @ApiPropertyOptional({ example: 1000.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  depositAmount?: number;

  @ApiPropertyOptional({ enum: DEPOSIT_REFUND_POLICIES, description: 'Required when depositAmount is set' })
  @ValidateIf((dto: ChangeBillingTermsDto) => dto.depositAmount !== undefined)
  @IsIn(DEPOSIT_REFUND_POLICIES)
  depositRefundPolicy?: DepositRefundPolicy;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  withdrawalNoticeGivenDate?: string;
}
