import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { FeeSortField } from './dto/fee-query.dto';
import { FeeType } from './dto/fee-type';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  type?: FeeType;
  isActive?: boolean;
  sortBy: FeeSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  name: string;
  type: FeeType;
  amount: number;
}

interface UpdateData {
  name?: string;
  type?: FeeType;
  amount?: number;
}

@Injectable()
export class FeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      tx.fee.create({
        data: {
          tenantId,
          name: data.name,
          type: data.type,
          amount: data.amount,
          createdBy,
        },
      }),
    );
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.FeeWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.name ? { name: containsInsensitive(options.name) } : {}),
        ...(options.type ? { type: options.type } : {}),
        ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
      };

      const [items, total] = await Promise.all([
        tx.fee.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.fee.count({ where }),
      ]);

      return { items, total };
    });
  }

  /**
   * Composable (optional tx) - so a future caller in another module's own
   * transaction (e.g. PlanFeeService.attach validating the Fee it's
   * attaching) can compose this read into its own transaction rather than
   * reaching into FeeRepository directly, matching
   * PlanPriceRepository.findEffective's identical tx?-composable shape.
   */
  findOneOrThrow(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    const run = (client: Prisma.TransactionClient) =>
      findOrThrow('Fee', id, () => client.fee.findFirst({ where: { id, tenantId, deletedAt: null } }));
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Fee', id, () => tx.fee.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.fee.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          amount: data.amount,
          updatedBy,
        },
      });
    });
  }

  /** The only writer of Fee.isActive - kept separate from update() per the approved design's distinct setActive method. */
  setActive(tenantId: string, id: string, isActive: boolean, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Fee', id, () => tx.fee.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.fee.update({ where: { id }, data: { isActive, updatedBy } });
    });
  }
}
