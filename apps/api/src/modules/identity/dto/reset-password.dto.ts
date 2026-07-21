import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 12, description: 'Length-based minimum, no composition rules' })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}
