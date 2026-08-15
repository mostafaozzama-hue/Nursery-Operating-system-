import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FEE_TYPES, FeeType } from './fee-type';

/**
 * isActive is deliberately absent - activate/deactivate is its own action
 * (FeeController.activate/deactivate -> FeeService.setActive), not part of
 * ordinary field editing, per the approved Backend Services design (matches
 * UpdatePlanDto's identical convention).
 */
export class UpdateFeeDto {
  @ApiPropertyOptional({ example: 'Meals' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: FEE_TYPES })
  @IsOptional()
  @IsIn(FEE_TYPES)
  type?: FeeType;

  @ApiPropertyOptional({ example: 500.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;
}
