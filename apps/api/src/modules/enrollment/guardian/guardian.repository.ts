import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { assertActiveMembership } from '../../../common/repository/assert-active-membership';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { GuardianConflictError } from './guardian-conflict.error';
import { GuardianSortField } from './dto/guardian-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  email?: string;
  sortBy: GuardianSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  userId?: string;
}

interface UpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  userId?: string;
}

@Injectable()
export class GuardianRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) => this.createWithinTx(tx, tenantId, data, createdBy));
  }

  /**
   * tx-accepting primitive (Easy Enrollment, Product Gap H) - same pattern as
   * ChildRepository.createWithinTx. create() above is a thin wrapper opening
   * its own transaction; AdmissionRepository composes this directly inside
   * its own single transaction for a new mother/father/additional guardian,
   * so the same membership/uniqueness checks run without duplicating them.
   */
  async createWithinTx(tx: Prisma.TransactionClient, tenantId: string, data: CreateData, createdBy: string) {
    if (data.userId) {
      await assertActiveMembership(tx, tenantId, data.userId);
      await this.assertNotLinkedToAnotherGuardian(tx, tenantId, data.userId);
    }

    return tx.guardian.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        userId: data.userId,
        createdBy,
      },
    });
  }

  /**
   * classroomId (Product Gap v2 Part 2: "Guardian access should inherit the
   * child's classroom scope"), when passed, restricts to guardians linked
   * to at least one child currently enrolled in that classroom. A guardian
   * with children in multiple classrooms remains visible to a STAFF member
   * scoped to any one of them - the guardian isn't "owned" by a single
   * classroom, only reachability through an in-scope child is required.
   */
  findMany(tenantId: string, options: FindManyOptions, classroomId?: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.GuardianWhereInput = {
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
        ...(options.email ? { email: containsInsensitive(options.email) } : {}),
        ...(classroomId
          ? {
              children: {
                some: {
                  deletedAt: null,
                  child: {
                    enrollments: { some: { classroomId, endDate: null, status: 'ACTIVE', deletedAt: null } },
                  },
                },
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        tx.guardian.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.guardian.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string, classroomId?: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Guardian', id, () =>
        tx.guardian.findFirst({
          where: {
            id,
            tenantId,
            deletedAt: null,
            ...(classroomId
              ? {
                  children: {
                    some: {
                      deletedAt: null,
                      child: {
                        enrollments: {
                          some: { classroomId, endDate: null, status: 'ACTIVE', deletedAt: null },
                        },
                      },
                    },
                  },
                }
              : {}),
          },
        }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Guardian', id, () =>
        tx.guardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (data.userId) {
        await assertActiveMembership(tx, tenantId, data.userId);
        await this.assertNotLinkedToAnotherGuardian(tx, tenantId, data.userId, id);
      }

      return tx.guardian.update({
        where: { id },
        data: { ...data, updatedBy },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Guardian', id, () =>
        tx.guardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.guardian.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }

  /**
   * Pre-checks a deterministic "already linked" message; the DB partial
   * unique index remains the race-safety backstop, caught generically by
   * the caller via isUniqueConstraintViolation. excludeId omits the row
   * being updated itself, so resubmitting a guardian's own unchanged
   * userId on a PATCH doesn't false-positive as a conflict.
   */
  private async assertNotLinkedToAnotherGuardian(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    const existingLink = await tx.guardian.findFirst({
      where: { tenantId, userId, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existingLink) {
      throw new GuardianConflictError('This user is already linked to another guardian profile in this tenant');
    }
  }
}
