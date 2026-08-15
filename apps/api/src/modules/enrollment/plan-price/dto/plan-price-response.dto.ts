import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanPriceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true, description: 'Null = currently open-ended' })
  effectiveTo!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
