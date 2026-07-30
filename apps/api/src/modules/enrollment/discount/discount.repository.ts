import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { DiscountSortField } from './dto/discount-query.dto';
import { DiscountScope } from './dto/discount-scope';
import { DiscountType } from './dto/discount-type';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  type?: DiscountType;
  isActive?: boolean;
  sortBy: DiscountSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  name: string;
  type: DiscountType;
  amount: number;
  stackable: boolean;
  scope: DiscountScope;
}

interface UpdateData {
  name?: string;
  type?: DiscountType;
  amount?: number;
  stackable?: boolean;
  scope?: DiscountScope;
}

@Injectable()
export class DiscountRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      tx.discount.create({
        data: {
          tenantId,
          name: data.name,
          type: data.type,
          amount: data.amount,
          stackable: data.stackable,
          scope: data.scope,
          createdBy,
        },
      }),
    );
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.DiscountWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.name ? { name: containsInsensitive(options.name) } : {}),
        ...(options.type ? { type: options.type } : {}),
        ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
      };

      const [items, total] = await Promise.all([
        tx.discount.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.discount.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Discount', id, () => tx.discount.findFirst({ where: { id, tenantId, deletedAt: null } })),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Discount', id, () => tx.discount.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.discount.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          amount: data.amount,
          stackable: data.stackable,
          scope: data.scope,
          updatedBy,
        },
      });
    });
  }

  /** The only writer of Discount.isActive - kept separate from update() per the approved design's distinct setActive method. */
  setActive(tenantId: string, id: string, isActive: boolean, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Discount', id, () => tx.discount.findFirst({ where: { id, tenantId, deletedAt: null } }));

      return tx.discount.update({ where: { id }, data: { isActive, updatedBy } });
    });
  }
}
