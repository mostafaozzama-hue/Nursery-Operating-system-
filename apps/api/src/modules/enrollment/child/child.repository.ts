import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ChildSortField } from './dto/child-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  sortBy: ChildSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  photoUrl?: string;
}

interface UpsertData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl?: string;
}

@Injectable()
export class ChildRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      tx.child.create({
        data: {
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          photoUrl: data.photoUrl,
          createdBy,
        },
      }),
    );
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.ChildWhereInput = {
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
      };

      const [items, total] = await Promise.all([
        tx.child.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.child.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Child', id, () => tx.child.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  update(tenantId: string, id: string, data: UpsertData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', id, () =>
        tx.child.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      return tx.child.update({
        where: { id },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          updatedBy,
        },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', id, () =>
        tx.child.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.child.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }
}
