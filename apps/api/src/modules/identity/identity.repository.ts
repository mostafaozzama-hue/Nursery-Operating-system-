import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { withUserContext } from './with-user-context';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
        status: 'ACTIVE',
      },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: 'ACTIVE' },
    });
  }

  /** Bootstraps tenant resolution: no tenant context exists yet at this point. */
  findActiveMembershipsForUser(userId: string) {
    return withUserContext(this.prisma, userId, (tx) =>
      tx.tenantMembership.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        include: { role: true },
      }),
    );
  }

  findSystemRoleId(key: 'OWNER' | 'ADMIN' | 'STAFF') {
    return this.prisma.role.findFirst({ where: { key, tenantId: null, deletedAt: null } });
  }

  /**
   * Bootstraps a brand new tenant + its first (OWNER) user + membership, all
   * in one transaction. No pre-existing tenant/session context exists to
   * authorize the membership insert against, so it's authorized the same way
   * with-user-context.ts does for login's self-lookup: app.user_id is set to
   * the just-created user's own id, satisfying the self_access RLS policy's
   * WITH CHECK (tenant_isolation doesn't apply yet - there's no "current"
   * tenant session, only the tenant being created in this same transaction).
   */
  registerTenantOwner(data: {
    tenantName: string;
    email: string;
    passwordHash: string;
    roleId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: data.tenantName } });
      const user = await tx.user.create({
        data: { email: data.email, passwordHash: data.passwordHash },
      });

      await tx.$executeRaw`SELECT set_config('app.user_id', ${user.id}, true)`;

      const membership = await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: data.roleId,
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      return { tenant, user, membership };
    });
  }

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    tokenVersion: number;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async rotateRefreshToken(oldTokenId: string, newTokenId: string) {
    await this.prisma.refreshToken.update({
      where: { id: oldTokenId },
      data: { revokedAt: new Date(), replacedByTokenId: newTokenId },
    });
  }

  async revokeAllActiveRefreshTokensForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
