import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { PAY_TYPES, PayType } from './create-payroll.dto';

export const PAYROLL_SORT_FIELDS = ['effectiveDate', 'createdAt'] as const;
export type PayrollSortField = (typeof PAYROLL_SORT_FIELDS)[number];

export class PayrollQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ enum: PAY_TYPES })
  @IsOptional()
  @IsIn(PAY_TYPES)
  payType?: PayType;

  @ApiPropertyOptional({ enum: PAYROLL_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PAYROLL_SORT_FIELDS)
  sortBy: PayrollSortField = 'createdAt';
}
