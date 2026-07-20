import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ChildGuardianConflictError } from './child-guardian-conflict.error';
import { ChildGuardianSortField } from './dto/child-guardian-query.dto';
import { RelationshipType } from './dto/create-child-guardian.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  childId?: string;
  guardianId?: string;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
  sortBy: ChildGuardianSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  childId: string;
  guardianId: string;
  relationshipType: RelationshipType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
}

interface UpdateData {
  relationshipType?: RelationshipType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
}

@Injectable()
export class ChildGuardianRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', data.childId, () =>
        tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
      );
      await findOrThrow('Guardian', data.guardianId, () =>
        tx.guardian.findFirst({ where: { id: data.guardianId, tenantId, deletedAt: null } }),
      );

      const existingPairing = await tx.childGuardian.findFirst({
        where: { tenantId, childId: data.childId, guardianId: data.guardianId, deletedAt: null },
      });
      if (existingPairing) {
        throw new ChildGuardianConflictError('This guardian is already linked to this child');
      }

      if (data.isPrimaryContact) {
        await this.assertNoExistingPrimary(tx, tenantId, data.childId);
      }

      return tx.childGuardian.create({
        data: {
          tenantId,
          childId: data.childId,
          guardianId: data.guardianId,
          relationshipType: data.relationshipType,
          isPrimaryContact: data.isPrimaryContact ?? false,
          isEmergencyContact: data.isEmergencyContact ?? false,
          canPickup: data.canPickup ?? false,
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.ChildGuardianWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.childId ? { childId: options.childId } : {}),
        ...(options.guardianId ? { guardianId: options.guardianId } : {}),
        ...(options.isPrimaryContact !== undefined ? { isPrimaryContact: options.isPrimaryContact } : {}),
        ...(options.isEmergencyContact !== undefined ? { isEmergencyContact: options.isEmergencyContact } : {}),
        ...(options.canPickup !== undefined ? { canPickup: options.canPickup } : {}),
      };

      const [items, total] = await Promise.all([
        tx.childGuardian.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.childGuardian.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('ChildGuardian', id, () =>
        tx.childGuardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const current = await findOrThrow('ChildGuardian', id, () =>
        tx.childGuardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      if (data.isPrimaryContact && !current.isPrimaryContact) {
        await this.assertNoExistingPrimary(tx, tenantId, current.childId, id);
      }

      return tx.childGuardian.update({
        where: { id },
        data: { ...data, updatedBy },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('ChildGuardian', id, () =>
        tx.childGuardian.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.childGuardian.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }

  /**
   * Pre-check for a deterministic conflict message. The partial unique index
   * child_guardians_one_primary_per_child remains the actual race-safety
   * guarantee - a concurrent request slipping past this check still fails
   * at the DB and is caught generically via isUniqueConstraintViolation.
   */
  private async assertNoExistingPrimary(
    tx: Prisma.TransactionClient,
    tenantId: string,
    childId: string,
    excludeId?: string,
  ): Promise<void> {
    const existingPrimary = await tx.childGuardian.findFirst({
      where: {
        tenantId,
        childId,
        isPrimaryContact: true,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existingPrimary) {
      throw new ChildGuardianConflictError('Child already has a primary contact');
    }
  }
}
