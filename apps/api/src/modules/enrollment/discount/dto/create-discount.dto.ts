import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { DISCOUNT_SCOPES, DiscountScope } from './discount-scope';
import { DISCOUNT_TYPES, DiscountType } from './discount-type';

export class CreateDiscountDto {
  @ApiProperty({ example: 'Early Bird Enrollment' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: DISCOUNT_TYPES })
  @IsIn(DISCOUNT_TYPES)
  type!: DiscountType;

  /**
   * The DB CHECK (discounts_amount_non_negative) only enforces >= 0 - it
   * can't also cap at 100, since this same column holds a currency amount
   * when type = FIXED_AMOUNT. The <= 100 cap for the PERCENTAGE case is
   * app-layer only, by explicit instruction (documented as tech debt in
   * SESSION_CHECKPOINT.md); a raw DB write bypassing this DTO could still
   * create an out-of-range value, the same accepted limitation every other
   * enum-like column in this schema already has.
   */
  @ApiProperty({ example: 10, description: 'Percentage (0-100) or a currency amount, per type' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ValidateIf((dto: CreateDiscountDto) => dto.type === 'PERCENTAGE')
  @Max(100)
  amount!: number;

  @ApiPropertyOptional({ default: false, description: 'Combines with other discounts if true; exclusive (best-for-the-family wins) if false' })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean = false;

  @ApiPropertyOptional({ enum: DISCOUNT_SCOPES, default: 'BASE_TUITION_ONLY' })
  @IsOptional()
  @IsIn(DISCOUNT_SCOPES)
  scope?: DiscountScope = 'BASE_TUITION_ONLY';
}
