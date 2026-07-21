import { Module } from '@nestjs/common';
import { MembershipRepository } from './membership.repository';
import { MembershipService } from './membership.service';

/** MembershipController (list/PATCH under /memberships) is added alongside membership admin. Invite/accept-invite live on IdentityController, under /auth, since they're session-bootstrapping actions. */
@Module({
  providers: [MembershipService, MembershipRepository],
  exports: [MembershipService],
})
export class MembershipModule {}
