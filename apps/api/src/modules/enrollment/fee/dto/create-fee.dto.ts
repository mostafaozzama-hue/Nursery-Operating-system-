import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { FEE_TYPES, FeeType } from './fee-type';

export class CreateFeeDto {
  @ApiProperty({ example: 'Meals' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: FEE_TYPES })
  @IsIn(FEE_TYPES)
  type!: FeeType;

  @ApiProperty({ example: 500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}
