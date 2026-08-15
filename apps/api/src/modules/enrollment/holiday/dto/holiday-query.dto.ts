import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { HOLIDAY_TYPES, HolidayType } from './holiday-type';

export const HOLIDAY_SORT_FIELDS = ['date', 'name', 'type', 'createdAt'] as const;
export type HolidaySortField = (typeof HOLIDAY_SORT_FIELDS)[number];

export class HolidayQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: HOLIDAY_TYPES })
  @IsOptional()
  @IsIn(HOLIDAY_TYPES)
  type?: HolidayType;

  @ApiPropertyOptional({ description: 'Exact date match' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: HOLIDAY_SORT_FIELDS, default: 'date' })
  @IsOptional()
  @IsIn(HOLIDAY_SORT_FIELDS)
  sortBy: HolidaySortField = 'date';
}
