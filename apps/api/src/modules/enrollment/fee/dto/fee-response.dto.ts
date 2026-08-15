import { ApiProperty } from '@nestjs/swagger';
import { FEE_TYPES, FeeType } from './fee-type';

export class FeeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: FEE_TYPES })
  type!: FeeType;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
