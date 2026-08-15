import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/** firstName/lastName are the only required fields - everything else is independently optional; a bare Staff row with just a name is a legitimate state. */
export class CreateStaffDto {
  @ApiProperty({ example: 'Ava' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: 'Teacher' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Primary/display classroom assignment only - not scheduling',
  })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Links to an existing User with an active membership in this tenant',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
