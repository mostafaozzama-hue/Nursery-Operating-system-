import { Injectable } from '@nestjs/common';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { MembershipConflictError } from './membership-conflict.error';

interface InviteData {
  email: string;
  roleKey: string;
  placeholderPasswordHash: string;
  tokenHash: string;
  inviteExpiresAt: Date;
}

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  invite(tenantId: string, data: InviteData, invitedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const role = await findOrThrow('Role', data.roleKey, () =>
        tx.role.findFirst({ where: { key: data.roleKey, tenantId: null, deletedAt: null } }),
      );

      let user = await tx.user.findFirst({
        where: { email: { equals: data.email, mode: 'insensitive' }, deletedAt: null },
      });
      if (!user) {
        user = await tx.user.create({
          data: { email: data.email, passwordHash: data.placeholderPasswordHash },
        });
      }

      const existingMembership = await tx.tenantMembership.findFirst({
        where: { userId: user.id, tenantId, deletedAt: null },
      });

      if (existingMembership?.status === 'ACTIVE') {
        throw new MembershipConflictError('This user is already an active member of this tenant');
      }

      const membership = existingMembership
        ? await tx.tenantMembership.update({
            where: { id: existingMembership.id },
            data: {
              roleId: role.id,
              status: 'INVITED',
              inviteTokenHash: data.tokenHash,
              inviteExpiresAt: data.inviteExpiresAt,
              invitedAt: new Date(),
              revokedAt: null,
              updatedBy: invitedBy,
            },
            include: { role: true },
          })
        : await tx.tenantMembership.create({
            data: {
              userId: user.id,
              tenantId,
              roleId: role.id,
              status: 'INVITED',
              inviteTokenHash: data.tokenHash,
              inviteExpiresAt: data.inviteExpiresAt,
              invitedAt: new Date(),
              createdBy: invitedBy,
            },
            include: { role: true },
          });

      return { membership, user };
    });
  }

  /**
   * tenantId comes directly from the (unauthenticated) request body, not a
   * JWT - accept-invite happens before the invitee has any session. It
   * isn't a secret (comparable to a workspace id), so this is safe: an
   * attacker who supplies the wrong tenantId simply matches no row, since
   * inviteTokenHash (the actual secret) and status are also required in
   * the same WHERE clause. Guarded update closes the double-accept race -
   * only succeeds if the row is still exactly INVITED with this token hash.
   */
  acceptInvite(tenantId: string, tokenHash: string, newPasswordHash: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const membership = await tx.tenantMembership.findFirst({
        where: { tenantId, inviteTokenHash: tokenHash, status: 'INVITED', deletedAt: null },
      });
      if (!membership) {
        throw new MembershipConflictError('This invite is invalid or has already been used');
      }

      if (membership.inviteExpiresAt && membership.inviteExpiresAt < new Date()) {
        throw new MembershipConflictError('This invite has expired');
      }

      const { count } = await tx.tenantMembership.updateMany({
        where: { id: membership.id, status: 'INVITED', inviteTokenHash: tokenHash },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
          inviteTokenHash: null,
          inviteExpiresAt: null,
          updatedBy: membership.userId,
        },
      });
      if (count === 0) {
        throw new MembershipConflictError('This invite is invalid or has already been used');
      }

      await tx.user.update({ where: { id: membership.userId }, data: { passwordHash: newPasswordHash } });

      return { membershipId: membership.id, userId: membership.userId };
    });
  }
}
