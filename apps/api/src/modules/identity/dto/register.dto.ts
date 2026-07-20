import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Barney Home Nursery' })
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @ApiProperty({ example: 'owner@barney.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12, description: 'Length-based minimum, no composition rules' })
  @IsString()
  @MinLength(12)
  password!: string;
}
