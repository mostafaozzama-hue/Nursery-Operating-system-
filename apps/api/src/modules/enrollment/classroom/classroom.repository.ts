import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ClassroomSortField } from './dto/classroom-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  sortBy: ClassroomSortField;
  sortOrder: 'asc' | 'desc';
}

interface UpsertData {
  name?: string;
  capacity?: number;
}

@Injectable()
export class ClassroomRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: { name: string; capacity: number }, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      tx.classroom.create({
        data: { tenantId, name: data.name, capacity: data.capacity, createdBy },
      }),
    );
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.ClassroomWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.name ? { name: containsInsensitive(options.name) } : {}),
      };

      const [items, total] = await Promise.all([
        tx.classroom.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.classroom.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Classroom', id, () =>
        tx.classroom.findFirst({ where: { id, tenantId, deletedAt: null } }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpsertData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Classroom', id, () =>
        tx.classroom.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      return tx.classroom.update({ where: { id }, data: { ...data, updatedBy } });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Classroom', id, () =>
        tx.classroom.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.classroom.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }
}
