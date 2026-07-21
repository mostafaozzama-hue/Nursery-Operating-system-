import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { TokenService } from '../token.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InviteMembershipDto } from './dto/invite-membership.dto';
import { MembershipQueryDto } from './dto/membership-query.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipConflictError } from './membership-conflict.error';
import { MembershipRepository } from './membership.repository';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CallingMember {
  role: string;
  membershipId: string;
}

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
      ...this.toResponse(membership, user, tenantId),
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

  async findAll(query: MembershipQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(
      items.map((membership) => this.toResponse(membership, membership.user, tenantId)),
      total,
      query,
    );
  }

  async update(id: string, dto: UpdateMembershipDto, caller: CallingMember) {
    const tenantId = this.currentTenant.getTenantId();

    if (id === caller.membershipId) {
      throw new ForbiddenException('Cannot modify your own membership');
    }

    const target = await this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);

    if (target.role.key === 'OWNER' && caller.role !== 'OWNER') {
      throw new ForbiddenException('Only an OWNER may manage another OWNER');
    }
    if (dto.roleKey === 'OWNER' && caller.role !== 'OWNER') {
      throw new ForbiddenException('Only an OWNER may grant the OWNER role');
    }

    const updatedBy = this.currentUser.getUserId();
    const updated = await this.repository
      .update(tenantId, id, dto, updatedBy)
      .catch((error) => this.translateError(error));

    return this.toResponse(updated, updated.user, tenantId);
  }

  private toResponse(
    membership: {
      id: string;
      status: string;
      invitedAt: Date | null;
      activatedAt: Date | null;
      revokedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      role: { key: string };
    },
    user: { id: string; email: string },
    tenantId: string,
  ) {
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
    };
  }

  private translateError(error: unknown): never {
    if (error instanceof MembershipConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
