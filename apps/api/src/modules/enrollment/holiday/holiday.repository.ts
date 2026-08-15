import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { HolidaySortField } from './dto/holiday-query.dto';
import { HolidayType } from './dto/holiday-type';

interface FindManyOptions {
  page: number;
  pageSize: number;
  type?: HolidayType;
  date?: string;
  sortBy: HolidaySortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  date: string;
  name: string;
  type: HolidayType;
  earlyCloseTime?: string;
}

interface UpdateData {
  date?: string;
  name?: string;
  type?: HolidayType;
  earlyCloseTime?: string | null;
}

/**
 * Parses a client-supplied "HH:mm"/"HH:mm:ss" wall-clock time into the Date
 * shape a @db.Time column needs. Built with Date.UTC (never local setters),
 * same convention as plan/plan.repository.ts's identical helper and for
 * the same reason: a time-without-timezone value must round-trip through
 * Date's UTC-based JSON serialization predictably.
 */
function parseTimeOfDay(value: string): Date {
  const [hourStr, minuteStr, secondStr = '0'] = value.split(':');
  return new Date(Date.UTC(1970, 0, 1, Number(hourStr), Number(minuteStr), Number(secondStr)));
}

@Injectable()
export class HolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      tx.holiday.create({
        data: {
          tenantId,
          date: new Date(data.date.slice(0, 10)),
          name: data.name,
          type: data.type,
          earlyCloseTime: data.earlyCloseTime ? parseTimeOfDay(data.earlyCloseTime) : undefined,
          createdBy,
        },
      }),
    );
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.HolidayWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.type ? { type: options.type } : {}),
        ...(options.date ? { date: new Date(options.date.slice(0, 10)) } : {}),
      };

      const [items, total] = await Promise.all([
        tx.holiday.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.holiday.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Holiday', id, () => tx.holiday.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Holiday', id, () => tx.holiday.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.holiday.update({
        where: { id },
        data: {
          date: data.date === undefined ? undefined : new Date(data.date.slice(0, 10)),
          name: data.name,
          type: data.type,
          earlyCloseTime:
            data.earlyCloseTime === undefined ? undefined : data.earlyCloseTime === null ? null : parseTimeOfDay(data.earlyCloseTime),
          updatedBy,
        },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Holiday', id, () => tx.holiday.findFirst({ where: { id, tenantId, deletedAt: null } }));

      await tx.holiday.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }
}
