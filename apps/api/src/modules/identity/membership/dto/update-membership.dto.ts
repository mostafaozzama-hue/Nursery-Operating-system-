import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MEMBERSHIP_ROLE_KEYS, MembershipRoleKey } from './invite-membership.dto';

export const MEMBERSHIP_STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/**
 * INVITED is deliberately not a settable target here - that state only
 * comes from POST /auth/invite. Privilege-escalation rules (no self-
 * modification, only OWNER manages/grants OWNER) are enforced in the
 * service, not by this DTO.
 */
export class UpdateMembershipDto {
  @ApiPropertyOptional({ enum: MEMBERSHIP_STATUSES })
  @IsOptional()
  @IsIn(MEMBERSHIP_STATUSES)
  status?: MembershipStatus;

  @ApiPropertyOptional({ enum: MEMBERSHIP_ROLE_KEYS })
  @IsOptional()
  @IsIn(MEMBERSHIP_ROLE_KEYS)
  roleKey?: MembershipRoleKey;
}
