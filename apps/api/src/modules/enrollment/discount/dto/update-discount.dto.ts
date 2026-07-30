import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { DISCOUNT_SCOPES, DiscountScope } from './discount-scope';
import { DISCOUNT_TYPES, DiscountType } from './discount-type';

/**
 * isActive is deliberately absent - activate/deactivate is its own action
 * (DiscountController.activate/deactivate -> DiscountService.setActive), not
 * part of ordinary field editing, per the approved Backend Services design
 * (matches UpdatePlanDto/UpdateFeeDto's identical convention).
 */
export class UpdateDiscountDto {
  @ApiPropertyOptional({ example: 'Early Bird Enrollment' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DISCOUNT_TYPES })
  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  type?: DiscountType;

  @ApiPropertyOptional({ example: 10, description: 'Percentage (0-100) or a currency amount, per type' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @ValidateIf((dto: UpdateDiscountDto) => dto.type === 'PERCENTAGE')
  @Max(100)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @ApiPropertyOptional({ enum: DISCOUNT_SCOPES })
  @IsOptional()
  @IsIn(DISCOUNT_SCOPES)
  scope?: DiscountScope;
}
