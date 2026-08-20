import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { containsInsensitive } from '../../../common/repository/query-filters.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { ChildSortField } from './dto/child-query.dto';

interface FindManyOptions {
  page: number;
  pageSize: number;
  name?: string;
  sortBy: ChildSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  photoUrl?: string;
  nickname?: string;
  nationality?: string;
  motherLanguage?: string;
  address?: string;
}

interface UpsertData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl?: string;
  nickname?: string;
  nationality?: string;
  motherLanguage?: string;
  address?: string;
}

@Injectable()
export class ChildRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, (tx) => this.createWithinTx(tx, tenantId, data, createdBy));
  }

  /**
   * tx-accepting primitive (Easy Enrollment, Product Gap H) - same pattern as
   * EnrollmentBillingTermsRepository.openWithEnrollment. create() above is a
   * thin wrapper opening its own transaction; AdmissionRepository composes
   * this directly inside its own single transaction so Child creation is
   * atomic with Guardian/ChildGuardian/Enrollment creation, without
   * duplicating this insert's shape.
   */
  createWithinTx(tx: Prisma.TransactionClient, tenantId: string, data: CreateData, createdBy: string) {
    return tx.child.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        photoUrl: data.photoUrl,
        nickname: data.nickname,
        nationality: data.nationality,
        motherLanguage: data.motherLanguage,
        address: data.address,
        createdBy,
      },
    });
  }

  /**
   * classroomId, when passed, restricts to children with a currently-open
   * (endDate IS NULL), ACTIVE enrollment in that classroom - same
   * current-enrollment convention AttendanceRepository.resolveClassroomId
   * already uses. Child has no direct classroom FK (placement lives on
   * Enrollment), hence the relation filter rather than a plain column
   * match. Product Gap v2 Part 2 (classroom-scoped STAFF access) - caller
   * resolves classroomId from CurrentClassroomScopeProvider; undefined
   * means unrestricted (OWNER/ADMIN).
   */
  findMany(tenantId: string, options: FindManyOptions, classroomId?: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.ChildWhereInput = {
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
        ...(classroomId
          ? { enrollments: { some: { classroomId, endDate: null, status: 'ACTIVE', deletedAt: null } } }
          : {}),
      };

      const [items, total] = await Promise.all([
        tx.child.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.child.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string, classroomId?: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('Child', id, () =>
        tx.child.findFirst({
          where: {
            id,
            tenantId,
            deletedAt: null,
            ...(classroomId
              ? { enrollments: { some: { classroomId, endDate: null, status: 'ACTIVE', deletedAt: null } } }
              : {}),
          },
        }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpsertData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', id, () =>
        tx.child.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      return tx.child.update({
        where: { id },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          updatedBy,
        },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', id, () =>
        tx.child.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.child.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }
}
