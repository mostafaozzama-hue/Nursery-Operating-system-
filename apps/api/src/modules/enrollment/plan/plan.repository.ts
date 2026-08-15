import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { PlanBillingCycle } from './dto/plan-billing-cycle';
import { PlanDayOfWeek } from './dto/plan-day-of-week';
import { PlanSortField } from './dto/plan-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  isActive?: boolean;
  sortBy: PlanSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  name: string;
  billingCycle: PlanBillingCycle;
  scheduleDaysOfWeek: PlanDayOfWeek[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
}

interface UpdateData {
  name?: string;
  billingCycle?: PlanBillingCycle;
  scheduleDaysOfWeek?: PlanDayOfWeek[];
  scheduleStartTime?: string | null;
  scheduleEndTime?: string | null;
}

/**
 * Parses a client-supplied "HH:mm"/"HH:mm:ss" wall-clock time into the Date
 * shape a @db.Time column needs. Built with Date.UTC (never local setters),
 * same convention as attendance/tenant-day.util.ts's parseTimeOfDay and for
 * the same reason: a time-without-timezone value must round-trip through
 * Date's UTC-based JSON serialization predictably.
 */
function parseTimeOfDay(value: string): Date {
  const [hourStr, minuteStr, secondStr = '0'] = value.split(':');
  return new Date(Date.UTC(1970, 0, 1, Number(hourStr), Number(minuteStr), Number(secondStr)));
}

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      tx.plan.create({
        data: {
          tenantId,
          name: data.name,
          billingCycle: data.billingCycle,
          scheduleDaysOfWeek: data.scheduleDaysOfWeek,
          scheduleStartTime: data.scheduleStartTime ? parseTimeOfDay(data.scheduleStartTime) : undefined,
          scheduleEndTime: data.scheduleEndTime ? parseTimeOfDay(data.scheduleEndTime) : undefined,
          createdBy,
        },
      }),
    );
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.PlanWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.name ? { name: containsInsensitive(options.name) } : {}),
        ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
      };

      const [items, total] = await Promise.all([
        tx.plan.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.plan.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Plan', id, () => tx.plan.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Plan', id, () => tx.plan.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.plan.update({
        where: { id },
        data: {
          name: data.name,
          billingCycle: data.billingCycle,
          scheduleDaysOfWeek: data.scheduleDaysOfWeek,
          scheduleStartTime:
            data.scheduleStartTime === undefined
              ? undefined
              : data.scheduleStartTime === null
                ? null
                : parseTimeOfDay(data.scheduleStartTime),
          scheduleEndTime:
            data.scheduleEndTime === undefined
              ? undefined
              : data.scheduleEndTime === null
                ? null
                : parseTimeOfDay(data.scheduleEndTime),
          updatedBy,
        },
      });
    });
  }

  /** The only writer of Plan.isActive - kept separate from update() per the approved design's distinct setActive method. */
  setActive(tenantId: string, id: string, isActive: boolean, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Plan', id, () => tx.plan.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.plan.update({ where: { id }, data: { isActive, updatedBy } });
    });
  }
}
