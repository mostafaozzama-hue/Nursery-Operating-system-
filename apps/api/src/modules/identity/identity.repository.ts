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
