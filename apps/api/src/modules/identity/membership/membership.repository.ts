import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { MembershipConflictError } from './membership-conflict.error';
import { MembershipQueryStatus, MembershipSortField } from './dto/membership-query.dto';
import { MembershipRoleKey } from './dto/invite-membership.dto';

interface InviteData {
  email: string;
  roleKey: string;
  placeholderPasswordHash: string;
  tokenHash: string;
  inviteExpiresAt: Date;
}

interface FindManyOptions {
  page: number;
  pageSize: number;
  status?: MembershipQueryStatus;
  roleKey?: MembershipRoleKey;
  sortBy: MembershipSortField;
  sortOrder: 'asc' | 'desc';
}

interface UpdateData {
  status?: string;
  roleKey?: MembershipRoleKey;
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

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.TenantMembershipWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.status ? { status: options.status } : {}),
        ...(options.roleKey ? { role: { key: options.roleKey } } : {}),
      };

      const [items, total] = await Promise.all([
        tx.tenantMembership.findMany({
          where,
          include: { role: true, user: true },
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.tenantMembership.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Membership', id, () =>
        tx.tenantMembership.findFirst({
          where: { id, tenantId, deletedAt: null },
          include: { role: true, user: true },
        }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Membership', id, () =>
        tx.tenantMembership.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      const role = data.roleKey
        ? await findOrThrow('Role', data.roleKey, () =>
            tx.role.findFirst({ where: { key: data.roleKey, tenantId: null, deletedAt: null } }),
          )
        : undefined;

      return tx.tenantMembership.update({
        where: { id },
        data: {
          status: data.status,
          roleId: role?.id,
          activatedAt: data.status === 'ACTIVE' ? new Date() : undefined,
          revokedAt: data.status === 'REVOKED' ? new Date() : undefined,
          updatedBy,
        },
        include: { role: true, user: true },
      });
    });
  }
}
