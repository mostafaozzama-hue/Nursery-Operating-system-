import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SiblingDiscountTierResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  siblingCountThreshold!: number;

  @ApiProperty()
  discountPercentage!: number;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true, description: 'Null = currently open-ended' })
  effectiveTo!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
