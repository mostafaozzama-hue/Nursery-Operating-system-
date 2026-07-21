import { ApiProperty } from '@nestjs/swagger';
import { MembershipResponseDto } from './membership-response.dto';

/**
 * inviteToken is returned only here, to the trusted, authenticated
 * OWNER/ADMIN caller who created the invite - no email infrastructure
 * exists in this codebase, so relaying it to the invitee out-of-band is
 * the caller's responsibility for now. This is a deliberate, narrow
 * exception: forgot-password's token is never returned anywhere, since
 * that caller isn't trusted the same way.
 */
export class InviteResponseDto extends MembershipResponseDto {
  @ApiProperty({ description: 'Raw invite token - shown once, never retrievable again' })
  inviteToken!: string;
}
