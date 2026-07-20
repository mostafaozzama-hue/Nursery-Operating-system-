import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * phone/email are each independently optional here - GuardianService.create
 * enforces "at least one of the two" as a service-layer check (not a
 * decorator), since it's a cross-field rule and this codebase keeps
 * business rules like that in services rather than class-validator
 * gymnastics (see Enrollment's capacity/same-classroom checks).
 */
export class CreateGuardianDto {
  @ApiProperty({ example: 'Jordan' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Rivera' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Links to an existing User with an active membership in this tenant' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
