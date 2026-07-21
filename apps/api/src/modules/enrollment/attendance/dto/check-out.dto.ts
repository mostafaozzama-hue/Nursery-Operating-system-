import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

export class CheckOutDto {
  @ApiPropertyOptional({ example: '17:30', description: 'Tenant-local wall-clock time; defaults to now' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'checkOutTime must be in HH:mm or HH:mm:ss format' })
  checkOutTime?: string;
}
