import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const CHILD_DISCOUNT_ASSIGNMENT_SORT_FIELDS = ['effectiveFrom', 'createdAt'] as const;
export type ChildDiscountAssignmentSortField = (typeof CHILD_DISCOUNT_ASSIGNMENT_SORT_FIELDS)[number];

export class ChildDiscountAssignmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CHILD_DISCOUNT_ASSIGNMENT_SORT_FIELDS, default: 'effectiveFrom' })
  @IsOptional()
  @IsIn(CHILD_DISCOUNT_ASSIGNMENT_SORT_FIELDS)
  sortBy: ChildDiscountAssignmentSortField = 'effectiveFrom';
}
