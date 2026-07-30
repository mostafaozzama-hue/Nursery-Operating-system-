import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const WAIVER_SORT_FIELDS = ['effectiveFrom', 'createdAt'] as const;
export type WaiverSortField = (typeof WAIVER_SORT_FIELDS)[number];

export class WaiverQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WAIVER_SORT_FIELDS, default: 'effectiveFrom' })
  @IsOptional()
  @IsIn(WAIVER_SORT_FIELDS)
  sortBy: WaiverSortField = 'effectiveFrom';
}
