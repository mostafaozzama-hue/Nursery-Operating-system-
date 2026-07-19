import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateClassroomDto {
  @ApiProperty({ example: 'Toddler Room' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;
}
