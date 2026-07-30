import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { HOLIDAY_TYPES, HolidayType } from './holiday-type';
import { TIME_OF_DAY_PATTERN } from './time-of-day.pattern';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'Eid al-Fitr' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: HOLIDAY_TYPES })
  @IsIn(HOLIDAY_TYPES)
  type!: HolidayType;

  /**
   * Deliberately unconditional - the ERD notes this field is "used when
   * PARTIAL_CLOSURE" but no frozen document states it's required for that
   * type, and section 7's own list of conditional-required-field examples
   * doesn't name this one either. Left as an explicitly unspecified
   * business decision rather than an invented rule - see
   * SESSION_CHECKPOINT.md.
   */
  @ApiPropertyOptional({ example: '13:00', description: 'Meaningful when type is PARTIAL_CLOSURE - not enforced as required for it, see comment' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_PATTERN, { message: 'earlyCloseTime must be in HH:mm or HH:mm:ss format' })
  earlyCloseTime?: string;
}
