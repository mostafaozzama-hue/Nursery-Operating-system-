import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

export class CheckInDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  childId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Defaults to the classroom from the child\'s current active enrollment, if any' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ example: '08:45', description: 'Tenant-local wall-clock time; defaults to now' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'checkInTime must be in HH:mm or HH:mm:ss format' })
  checkInTime?: string;
}
