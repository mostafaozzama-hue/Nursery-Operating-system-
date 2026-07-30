import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, Max, Min } from 'class-validator';

export class SetSiblingDiscountTierDto {
  /**
   * No frozen document states a minimum threshold - domain-model.md's "e.g.
   * 2nd child, 3rd+" and its ERD's "e.g. 2, 3" are illustrative examples,
   * not a stated rule, and no DB constraint exists either. @Min(1) is a
   * safe floor (rules out zero/negative, which are wrong under any
   * reading) - the business minimum itself is deliberately left
   * unspecified rather than assumed to be 2.
   */
  @ApiProperty({ example: 2, description: 'Minimum validated is 1 - the business minimum (e.g. whether a 1st child can have a tier) is unspecified in the frozen design, not assumed' })
  @IsInt()
  @Min(1)
  siblingCountThreshold!: number;

  @ApiProperty({ example: 10, description: 'Percentage, 0-100' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage!: number;

  @ApiProperty({ example: '2026-09-01', description: "Must be after the current tier period's own effectiveFrom, for this same threshold" })
  @IsDateString()
  effectiveFrom!: string;
}
