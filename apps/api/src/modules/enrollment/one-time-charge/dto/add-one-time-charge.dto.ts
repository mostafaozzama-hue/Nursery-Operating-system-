import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateIf } from 'class-validator';
import { ManualOverrideReasonCode, MANUAL_OVERRIDE_REASON_CODES } from '../../enrollment-billing-terms/dto/manual-override-reason-code';
import { ChargeCategory, CHARGE_CATEGORIES } from './charge-category';

/**
 * reasonCode/reasonNote are optional here, not because they're optional in
 * general - ManualOverride.reasonCode is mandatory whenever an override is
 * actually recorded - but because "is this invoice currently DRAFT" can't
 * be determined at the DTO layer (it requires a DB read), so the
 * DRAFT-vs-non-DRAFT-dependent requirement is enforced at the service
 * layer instead (OneTimeChargeConflictError), the same three-layer
 * validation split already used throughout this codebase.
 */
export class AddOneTimeChargeDto {
  @ApiProperty({ example: 'Late pickup fee - 30 min' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 25.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitAmount!: number;

  @ApiProperty({ enum: CHARGE_CATEGORIES })
  @IsIn(CHARGE_CATEGORIES)
  chargeCategory!: ChargeCategory;

  @ApiPropertyOptional({ enum: MANUAL_OVERRIDE_REASON_CODES, description: 'Required when the invoice is not currently DRAFT' })
  @IsOptional()
  @IsIn(MANUAL_OVERRIDE_REASON_CODES)
  reasonCode?: ManualOverrideReasonCode;

  @ApiPropertyOptional({ description: 'Required when reasonCode = OTHER' })
  @ValidateIf((dto: AddOneTimeChargeDto) => dto.reasonCode === 'OTHER')
  @IsString()
  @IsNotEmpty()
  reasonNote?: string;
}
