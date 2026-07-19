import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ClassroomSortField } from './dto/classroom-query.dto';

export class ClassroomNotFoundError extends Error {
  constructor(id: string) {
    super(`Classroom ${id} not found`);
  }
}

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
        ...(options.name
          ? { name: { contains: options.name, mode: 'insensitive' } }
          : {}),
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
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const classroom = await tx.classroom.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!classroom) {
        throw new ClassroomNotFoundError(id);
      }

      return classroom;
    });
  }

  update(tenantId: string, id: string, data: UpsertData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const existing = await tx.classroom.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new ClassroomNotFoundError(id);
      }

      return tx.classroom.update({ where: { id }, data: { ...data, updatedBy } });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const existing = await tx.classroom.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new ClassroomNotFoundError(id);
      }

      await tx.classroom.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }
}
