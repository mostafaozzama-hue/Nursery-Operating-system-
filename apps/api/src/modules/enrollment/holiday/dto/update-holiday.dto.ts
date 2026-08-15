import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { HOLIDAY_TYPES, HolidayType } from './holiday-type';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

export class UpdateHolidayDto {
  @ApiPropertyOptional({ example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Eid al-Fitr' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: HOLIDAY_TYPES })
  @IsOptional()
  @IsIn(HOLIDAY_TYPES)
  type?: HolidayType;

  /** Unconditional - see CreateHolidayDto's identical field comment. */
  @ApiPropertyOptional({ example: '13:00', description: 'Set to null to clear' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'earlyCloseTime must be in HH:mm or HH:mm:ss format' })
  earlyCloseTime?: string | null;
}
