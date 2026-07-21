import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

/** totalAmount is never accepted here - it's always server-computed as quantity * unitAmount. */
export class CreateLineItemDto {
  @ApiProperty({ example: 'September tuition' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitAmount!: number;
}
