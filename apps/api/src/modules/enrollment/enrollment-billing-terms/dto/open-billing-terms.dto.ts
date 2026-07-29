import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { DEPOSIT_REFUND_POLICIES, DepositRefundPolicy } from './deposit-refund-policy';

/**
 * Embedded, optional sub-object on CreateEnrollmentDto - billing terms are
 * opt-in at enrollment creation (per the approved implementation scope),
 * not mandatory, to keep the already-shipped POST /enrollments contract
 * backward-compatible. When supplied, billingGuardianId is the only
 * genuinely required field, matching EnrollmentBillingTerms.billing_guardian_id's
 * NOT NULL constraint.
 */
export class OpenBillingTermsDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Nullable - a placement can exist without a Plan assigned yet' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiProperty({ format: 'uuid', description: 'Who is financially responsible for this placement' })
  @IsUUID()
  billingGuardianId!: string;

  @ApiPropertyOptional({ example: 4500.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  customRateAmount?: number;

  @ApiPropertyOptional({ description: 'Required when customRateAmount is set' })
  @ValidateIf((dto: OpenBillingTermsDto) => dto.customRateAmount !== undefined)
  @IsString()
  customRateReason?: string;

  @ApiPropertyOptional({ example: 1000.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  depositAmount?: number;

  @ApiPropertyOptional({ enum: DEPOSIT_REFUND_POLICIES, description: 'Required when depositAmount is set' })
  @ValidateIf((dto: OpenBillingTermsDto) => dto.depositAmount !== undefined)
  @IsIn(DEPOSIT_REFUND_POLICIES)
  depositRefundPolicy?: DepositRefundPolicy;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Rarely set at creation - covers re-enrollment edge cases' })
  @IsOptional()
  @IsDateString()
  withdrawalNoticeGivenDate?: string;
}
