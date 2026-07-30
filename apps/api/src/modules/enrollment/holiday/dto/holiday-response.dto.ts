import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HOLIDAY_TYPES, HolidayType } from './holiday-type';

export class HolidayResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  date!: Date;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: HOLIDAY_TYPES })
  type!: HolidayType;

  @ApiPropertyOptional({ type: Date, nullable: true })
  earlyCloseTime!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
