import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { CurrentUserProvider } from '../current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { TokenService } from '../token.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InviteMembershipDto } from './dto/invite-membership.dto';
import { MembershipConflictError } from './membership-conflict.error';
import { MembershipRepository } from './membership.repository';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MembershipService {
  constructor(
    private readonly repository: MembershipRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
    private readonly tokenService: TokenService,
  ) {}

  async invite(dto: InviteMembershipDto, callerRole: string) {
    if (dto.roleKey === 'OWNER' && callerRole !== 'OWNER') {
      throw new ForbiddenException('Only an OWNER may invite another OWNER');
    }

    const tenantId = this.currentTenant.getTenantId();
    const invitedBy = this.currentUser.getUserId();

    const placeholderPasswordHash = await argon2.hash(randomBytes(32).toString('hex'));
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.tokenService.hashToken(rawToken);

    const { membership, user } = await this.repository
      .invite(
        tenantId,
        {
          email: dto.email,
          roleKey: dto.roleKey,
          placeholderPasswordHash,
          tokenHash,
          inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
        invitedBy,
      )
      .catch((error) => this.translateError(error));

    return {
      id: membership.id,
      userId: user.id,
      email: user.email,
      tenantId,
      roleKey: membership.role.key,
      status: membership.status,
      invitedAt: membership.invitedAt,
      activatedAt: membership.activatedAt,
      revokedAt: membership.revokedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      inviteToken: rawToken,
    };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<void> {
    const tokenHash = this.tokenService.hashToken(dto.token);
    const newPasswordHash = await argon2.hash(dto.password);

    await this.repository
      .acceptInvite(dto.tenantId, tokenHash, newPasswordHash)
      .catch((error) => this.translateError(error));
  }

  private translateError(error: unknown): never {
    if (error instanceof MembershipConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
