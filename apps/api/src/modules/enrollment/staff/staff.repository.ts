import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { assertActiveMembership } from '../../../common/repository/assert-active-membership';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { StaffConflictError } from './staff-conflict.error';
import { StaffSortField } from './dto/staff-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  classroomId?: string;
  position?: string;
  sortBy: StaffSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  position?: string;
  hireDate?: string;
  classroomId?: string;
  userId?: string;
}

interface UpdateData {
  position?: string;
  hireDate?: string;
  classroomId?: string;
  userId?: string;
}

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      if (data.classroomId) {
        await findOrThrow('Classroom', data.classroomId, () =>
          tx.classroom.findFirst({ where: { id: data.classroomId, tenantId, deletedAt: null } }),
        );
      }

      if (data.userId) {
        await assertActiveMembership(tx, tenantId, data.userId);
        await this.assertNotLinkedToAnotherStaff(tx, tenantId, data.userId);
      }

      return tx.staff.create({
        data: {
          tenantId,
          position: data.position,
          hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
          classroomId: data.classroomId,
          userId: data.userId,
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.StaffWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.classroomId ? { classroomId: options.classroomId } : {}),
        ...(options.position ? { position: containsInsensitive(options.position) } : {}),
      };

      const [items, total] = await Promise.all([
        tx.staff.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.staff.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Staff', id, () => tx.staff.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Staff', id, () =>
        tx.staff.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (data.classroomId) {
        await findOrThrow('Classroom', data.classroomId, () =>
          tx.classroom.findFirst({ where: { id: data.classroomId, tenantId, deletedAt: null } }),
        );
      }

      if (data.userId) {
        await assertActiveMembership(tx, tenantId, data.userId);
        await this.assertNotLinkedToAnotherStaff(tx, tenantId, data.userId, id);
      }

      return tx.staff.update({
        where: { id },
        data: {
          ...data,
          hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
          updatedBy,
        },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Staff', id, () =>
        tx.staff.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.staff.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }

  /**
   * Pre-checks a deterministic "already linked" message; the DB partial
   * unique index remains the race-safety backstop, caught generically by
   * the caller via isUniqueConstraintViolation. excludeId omits the row
   * being updated itself, so resubmitting a staff row's own unchanged
   * userId on a PATCH doesn't false-positive as a conflict.
   */
  private async assertNotLinkedToAnotherStaff(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    const existingLink = await tx.staff.findFirst({
      where: { tenantId, userId, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existingLink) {
      throw new StaffConflictError('This user is already linked to another staff profile in this tenant');
    }
  }
}
