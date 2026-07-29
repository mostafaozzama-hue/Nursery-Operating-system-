import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, Min } from 'class-validator';

export class SetPlanPriceDto {
  @ApiProperty({ example: 4500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-09-01', description: 'Must be after the current price period\'s own effectiveFrom' })
  @IsDateString()
  effectiveFrom!: string;
}
