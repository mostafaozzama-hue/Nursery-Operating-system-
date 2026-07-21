import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

/** Every field is independently optional - a bare Staff row with only a userId link ("works here, details pending") is a legitimate state. */
export class CreateStaffDto {
  @ApiPropertyOptional({ example: 'Teacher' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Primary/display classroom assignment only - not scheduling' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Links to an existing User with an active membership in this tenant' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
