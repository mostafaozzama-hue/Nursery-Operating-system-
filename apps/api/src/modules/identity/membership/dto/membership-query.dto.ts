import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { MEMBERSHIP_ROLE_KEYS, MembershipRoleKey } from './invite-membership.dto';

export const MEMBERSHIP_QUERY_STATUSES = ['INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
export type MembershipQueryStatus = (typeof MEMBERSHIP_QUERY_STATUSES)[number];

export const MEMBERSHIP_SORT_FIELDS = ['createdAt', 'invitedAt', 'activatedAt'] as const;
export type MembershipSortField = (typeof MEMBERSHIP_SORT_FIELDS)[number];

export class MembershipQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MEMBERSHIP_QUERY_STATUSES })
  @IsOptional()
  @IsIn(MEMBERSHIP_QUERY_STATUSES)
  status?: MembershipQueryStatus;

  @ApiPropertyOptional({ enum: MEMBERSHIP_ROLE_KEYS })
  @IsOptional()
  @IsIn(MEMBERSHIP_ROLE_KEYS)
  roleKey?: MembershipRoleKey;

  @ApiPropertyOptional({ enum: MEMBERSHIP_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(MEMBERSHIP_SORT_FIELDS)
  sortBy: MembershipSortField = 'createdAt';
}
