import { ApiProperty } from '@nestjs/swagger';
import { DISCOUNT_SCOPES, DiscountScope } from './discount-scope';
import { DISCOUNT_TYPES, DiscountType } from './discount-type';

export class DiscountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: DISCOUNT_TYPES })
  type!: DiscountType;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  stackable!: boolean;

  @ApiProperty({ enum: DISCOUNT_SCOPES })
  scope!: DiscountScope;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
