import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { AttendanceConflictError } from './attendance-conflict.error';
import { getTenantLocalDate, parseTimeOfDay, tenantLocalTimeAsDate } from './tenant-day.util';
import { AttendanceSortField, AttendanceStatus } from './dto/attendance-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  childId?: string;
  classroomId?: string;
  date?: string;
  status?: AttendanceStatus;
  sortBy: AttendanceSortField;
  sortOrder: 'asc' | 'desc';
}

interface CheckInData {
  childId: string;
  classroomId?: string;
  checkInTime?: string;
}

interface CheckOutData {
  checkOutTime?: string;
}

interface MarkAbsentData {
  childId: string;
  classroomId?: string;
}

interface UpdateData {
  classroomId?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  checkIn(tenantId: string, data: CheckInData, actingUserId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', data.childId, () =>
        tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
      );

      const classroomId = await this.resolveClassroomId(tx, tenantId, data.childId, data.classroomId);
      const tenant = await findOrThrow('Tenant', tenantId, () =>
        tx.tenant.findFirst({ where: { id: tenantId, deletedAt: null } }),
      );

      const date = getTenantLocalDate(tenant.timezone);
      const checkInTime = data.checkInTime
        ? parseTimeOfDay(data.checkInTime)
        : tenantLocalTimeAsDate(tenant.timezone);

      await this.assertNoRecordForDay(tx, tenantId, data.childId, date);

      return tx.attendance.create({
        data: {
          tenantId,
          childId: data.childId,
          classroomId,
          date,
          checkInTime,
          status: 'CHECKED_IN',
          checkedInBy: actingUserId,
          createdBy: actingUserId,
        },
      });
    });
  }

  checkOut(tenantId: string, id: string, data: CheckOutData, actingUserId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const current = await findOrThrow('Attendance', id, () =>
        tx.attendance.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (current.checkInTime === null) {
        throw new AttendanceConflictError('Cannot check out a record with no check-in (e.g. an absence)');
      }

      if (current.checkOutTime !== null) {
        throw new AttendanceConflictError('This attendance record is already checked out');
      }

      const tenant = await findOrThrow('Tenant', tenantId, () =>
        tx.tenant.findFirst({ where: { id: tenantId, deletedAt: null } }),
      );
      const checkOutTime = data.checkOutTime
        ? parseTimeOfDay(data.checkOutTime)
        : tenantLocalTimeAsDate(tenant.timezone);

      return tx.attendance.update({
        where: { id },
        data: { checkOutTime, status: 'CHECKED_OUT', checkedOutBy: actingUserId, updatedBy: actingUserId },
      });
    });
  }

  markAbsent(tenantId: string, data: MarkAbsentData, actingUserId: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', data.childId, () =>
        tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
      );

      const classroomId = await this.resolveClassroomId(tx, tenantId, data.childId, data.classroomId);
      const tenant = await findOrThrow('Tenant', tenantId, () =>
        tx.tenant.findFirst({ where: { id: tenantId, deletedAt: null } }),
      );
      const date = getTenantLocalDate(tenant.timezone);

      await this.assertNoRecordForDay(tx, tenantId, data.childId, date);

      return tx.attendance.create({
        data: {
          tenantId,
          childId: data.childId,
          classroomId,
          date,
          status: 'ABSENT',
          createdBy: actingUserId,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.AttendanceWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.childId ? { childId: options.childId } : {}),
        ...(options.classroomId ? { classroomId: options.classroomId } : {}),
        ...(options.date ? { date: new Date(options.date) } : {}),
        ...(options.status ? { status: options.status } : {}),
      };

      const [items, total] = await Promise.all([
        tx.attendance.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.attendance.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Attendance', id, () =>
        tx.attendance.findFirst({ where: { id, tenantId, deletedAt: null } }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const current = await findOrThrow('Attendance', id, () =>
        tx.attendance.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (data.classroomId) {
        await findOrThrow('Classroom', data.classroomId, () =>
          tx.classroom.findFirst({ where: { id: data.classroomId, tenantId, deletedAt: null } }),
        );
      }

      const checkInTime =
        data.checkInTime === undefined
          ? current.checkInTime
          : data.checkInTime === null
            ? null
            : parseTimeOfDay(data.checkInTime);

      const checkOutTime =
        data.checkOutTime === undefined
          ? current.checkOutTime
          : data.checkOutTime === null
            ? null
            : parseTimeOfDay(data.checkOutTime);

      const status = checkOutTime ? 'CHECKED_OUT' : checkInTime ? 'CHECKED_IN' : 'ABSENT';

      return tx.attendance.update({
        where: { id },
        data: {
          classroomId: data.classroomId ?? undefined,
          checkInTime,
          checkOutTime,
          status,
          updatedBy,
        },
      });
    });
  }

  /** classroomId, if omitted, defaults from the child's current open (ACTIVE) Enrollment - Enrollment stays the single source of truth for classroom assignment. */
  private async resolveClassroomId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    childId: string,
    classroomId?: string,
  ): Promise<string | undefined> {
    if (classroomId) {
      await findOrThrow('Classroom', classroomId, () =>
        tx.classroom.findFirst({ where: { id: classroomId, tenantId, deletedAt: null } }),
      );
      return classroomId;
    }

    const activeEnrollment = await tx.enrollment.findFirst({
      where: { childId, tenantId, endDate: null, status: 'ACTIVE', deletedAt: null },
    });
    return activeEnrollment?.classroomId ?? undefined;
  }

  private async assertNoRecordForDay(
    tx: Prisma.TransactionClient,
    tenantId: string,
    childId: string,
    date: Date,
  ): Promise<void> {
    const existing = await tx.attendance.findFirst({ where: { tenantId, childId, date } });
    if (existing) {
      throw new AttendanceConflictError(
        `Child ${childId} already has an attendance record for ${date.toISOString().slice(0, 10)}`,
      );
    }
  }
}
