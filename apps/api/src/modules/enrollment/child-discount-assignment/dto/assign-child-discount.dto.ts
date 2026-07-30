import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AssignChildDiscountDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2026-12-01', description: 'For a bounded promotional discount, known upfront. Must be after effectiveFrom.' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
