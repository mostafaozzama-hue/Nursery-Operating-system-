import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

export const MEMBERSHIP_ROLE_KEYS = ['OWNER', 'ADMIN', 'STAFF'] as const;
export type MembershipRoleKey = (typeof MEMBERSHIP_ROLE_KEYS)[number];

/** Inviting as OWNER is only permitted for an OWNER caller - enforced in the service, not here. */
export class InviteMembershipDto {
  @ApiProperty({ example: 'new-staff@barney.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLE_KEYS })
  @IsIn(MEMBERSHIP_ROLE_KEYS)
  roleKey!: MembershipRoleKey;
}
