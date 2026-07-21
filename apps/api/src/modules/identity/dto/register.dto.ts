import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsIanaTimezone } from '../../../common/validators/is-iana-timezone.decorator';

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

  @ApiPropertyOptional({ example: 'America/New_York', description: 'IANA timezone; defaults to UTC if omitted' })
  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;
}
