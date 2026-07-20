import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { GuardianConflictError } from './guardian-conflict.error';
import { GuardianValidationError } from './guardian-validation.error';
import { GuardianSortField } from './dto/guardian-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  email?: string;
  sortBy: GuardianSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  userId?: string;
}

interface UpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  userId?: string;
}

@Injectable()
export class GuardianRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      if (data.userId) {
        await this.assertLinkable(tx, tenantId, data.userId);
      }

      return tx.guardian.create({
        data: {
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          userId: data.userId,
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.GuardianWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.name
          ? {
              OR: [
                { firstName: containsInsensitive(options.name) },
                { lastName: containsInsensitive(options.name) },
              ],
            }
          : {}),
        ...(options.email ? { email: containsInsensitive(options.email) } : {}),
      };

      const [items, total] = await Promise.all([
        tx.guardian.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.guardian.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Guardian', id, () => tx.guardian.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Guardian', id, () =>
        tx.guardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (data.userId) {
        await this.assertLinkable(tx, tenantId, data.userId, id);
      }

      return tx.guardian.update({
        where: { id },
        data: { ...data, updatedBy },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Guardian', id, () =>
        tx.guardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.guardian.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }

  /**
   * userId must belong to a real user (404 if not) with an active
   * TenantMembership in this same tenant (400 if not) - the documented,
   * application-layer-only invariant from the domain model. Pre-checks the
   * "already linked to another guardian" case for a deterministic message;
   * the DB partial unique index remains the race-safety backstop, caught
   * generically by the caller via isUniqueConstraintViolation.
   */
  private async assertLinkable(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    await findOrThrow('User', userId, () => tx.user.findFirst({ where: { id: userId, deletedAt: null } }));

    const activeMembership = await tx.tenantMembership.findFirst({
      where: { userId, tenantId, status: 'ACTIVE', deletedAt: null },
    });
    if (!activeMembership) {
      throw new GuardianValidationError(`User ${userId} does not have an active membership in this tenant`);
    }

    const existingLink = await tx.guardian.findFirst({
      where: { tenantId, userId, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existingLink) {
      throw new GuardianConflictError('This user is already linked to another guardian profile in this tenant');
    }
  }
}
