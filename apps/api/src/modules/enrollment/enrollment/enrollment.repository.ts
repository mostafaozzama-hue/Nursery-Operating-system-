import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { EnrollmentConflictError } from './enrollment-conflict.error';
import { EnrollmentSortField, EnrollmentStatus } from './dto/enrollment-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  childId?: string;
  classroomId?: string;
  status?: EnrollmentStatus;
  open?: boolean;
  sortBy: EnrollmentSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  childId: string;
  classroomId?: string;
  createdReason?: string;
}

interface TransferData {
  newClassroomId: string;
  reason?: string;
}

interface WithdrawData {
  reason?: string;
}

interface UpdateData {
  createdReason?: string;
}

@Injectable()
export class EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', data.childId, () =>
        tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
      );

      let status: EnrollmentStatus = 'WAITLISTED';
      if (data.classroomId) {
        await this.assertClassroomAvailable(tx, tenantId, data.classroomId);
        status = 'ACTIVE';
      }

      return tx.enrollment.create({
        data: {
          tenantId,
          childId: data.childId,
          classroomId: data.classroomId,
          status,
          startDate: new Date(),
          createdReason: data.createdReason,
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.EnrollmentWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.childId ? { childId: options.childId } : {}),
        ...(options.classroomId ? { classroomId: options.classroomId } : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(options.open !== undefined ? { endDate: options.open ? null : { not: null } } : {}),
      };

      const [items, total] = await Promise.all([
        tx.enrollment.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.enrollment.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Enrollment', id, () =>
        tx.enrollment.findFirst({ where: { id, tenantId, deletedAt: null } }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Enrollment', id, () =>
        tx.enrollment.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      return tx.enrollment.update({
        where: { id },
        data: { ...data, updatedBy },
      });
    });
  }

  transfer(tenantId: string, id: string, data: TransferData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const current = await findOrThrow('Enrollment', id, () =>
        tx.enrollment.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (current.endDate !== null) {
        throw new EnrollmentConflictError('Enrollment already closed');
      }

      if (current.classroomId === data.newClassroomId) {
        throw new EnrollmentConflictError('Already assigned to this classroom');
      }

      await this.assertClassroomAvailable(tx, tenantId, data.newClassroomId);

      const now = new Date();

      // Guarded close: only succeeds if still open. A concurrent
      // transfer/withdraw between the check above and here loses this race
      // and gets a clean 409 instead of silently double-closing.
      const { count } = await tx.enrollment.updateMany({
        where: { id, endDate: null },
        data: { endDate: now, endedReason: data.reason ?? 'Transferred', updatedBy },
      });

      if (count === 0) {
        throw new EnrollmentConflictError('Enrollment already closed');
      }

      return tx.enrollment.create({
        data: {
          tenantId,
          childId: current.childId,
          classroomId: data.newClassroomId,
          status: 'ACTIVE',
          startDate: now,
          createdReason: data.reason ?? 'Transferred',
          createdBy: updatedBy,
        },
      });
    });
  }

  withdraw(tenantId: string, id: string, data: WithdrawData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Enrollment', id, () =>
        tx.enrollment.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      const { count } = await tx.enrollment.updateMany({
        where: { id, endDate: null },
        data: {
          endDate: new Date(),
          endedReason: data.reason ?? 'Withdrawn',
          status: 'WITHDRAWN',
          updatedBy,
        },
      });

      if (count === 0) {
        throw new EnrollmentConflictError('Enrollment already closed');
      }

      return findOrThrow('Enrollment', id, () => tx.enrollment.findUnique({ where: { id } }));
    });
  }

  /**
   * Count-then-compare has a small TOCTOU race under concurrent requests
   * targeting the same classroom's last open seat - acceptable for the MVP
   * (capacity overshoot by one is a minor, self-correcting operational
   * issue, unlike double-enrolling a child).
   */
  private async assertClassroomAvailable(
    tx: Prisma.TransactionClient,
    tenantId: string,
    classroomId: string,
  ): Promise<void> {
    const classroom = await findOrThrow('Classroom', classroomId, () =>
      tx.classroom.findFirst({ where: { id: classroomId, tenantId, deletedAt: null } }),
    );

    const activeCount = await tx.enrollment.count({
      where: { tenantId, classroomId, status: 'ACTIVE', endDate: null, deletedAt: null },
    });

    if (activeCount >= classroom.capacity) {
      throw new EnrollmentConflictError(`Classroom ${classroomId} has reached capacity`);
    }
  }
}
