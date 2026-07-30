import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExpireChildDiscountDto {
  @ApiProperty({ example: '2026-12-01', description: "Must be after this assignment's own effectiveFrom" })
  @IsDateString()
  effectiveTo!: string;
}
