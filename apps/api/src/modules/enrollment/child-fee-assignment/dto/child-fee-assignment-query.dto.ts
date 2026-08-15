import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';

export const CHILD_FEE_ASSIGNMENT_SORT_FIELDS = ['effectiveFrom', 'createdAt'] as const;
export type ChildFeeAssignmentSortField = (typeof CHILD_FEE_ASSIGNMENT_SORT_FIELDS)[number];

export class ChildFeeAssignmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CHILD_FEE_ASSIGNMENT_SORT_FIELDS, default: 'effectiveFrom' })
  @IsOptional()
  @IsIn(CHILD_FEE_ASSIGNMENT_SORT_FIELDS)
  sortBy: ChildFeeAssignmentSortField = 'effectiveFrom';
}
