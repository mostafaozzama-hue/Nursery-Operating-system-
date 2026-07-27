import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const LINE_ITEM_SORT_FIELDS = ['createdAt', 'totalAmount'] as const;
export type LineItemSortField = (typeof LINE_ITEM_SORT_FIELDS)[number];

export class LineItemQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LINE_ITEM_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(LINE_ITEM_SORT_FIELDS)
  sortBy: LineItemSortField = 'createdAt';
}
