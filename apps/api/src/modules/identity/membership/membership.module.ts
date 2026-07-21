import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipRepository } from './membership.repository';
import { MembershipService } from './membership.service';

/** MembershipController serves /memberships (list/PATCH). Invite/accept-invite live on IdentityController, under /auth, since they're session-bootstrapping actions rather than tenant administration. */
@Module({
  controllers: [MembershipController],
  providers: [MembershipService, MembershipRepository],
  exports: [MembershipService],
})
export class MembershipModule {}
