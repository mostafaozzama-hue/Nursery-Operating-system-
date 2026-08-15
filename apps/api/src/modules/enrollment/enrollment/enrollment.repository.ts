import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { CapacityService } from '../capacity/capacity.service';
// EnrollmentBillingTermsRepository, not the request-scoped Service - only
// openWithEnrollment/closeWithEnrollment are used here (explicit tenantId,
// no CurrentTenantProvider/CurrentUserProvider needed), and injecting the
// request-scoped Service into this cross-module singleton repository broke
// EnrollmentBillingTermsController's own request-scope resolution (root
// cause confirmed experimentally - see docs/SESSION_CHECKPOINT.md).
import { EnrollmentBillingTermsRepository } from '../enrollment-billing-terms/enrollment-billing-terms.repository';
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

interface CreateBillingTermsData {
  planId?: string;
  billingGuardianId: string;
  customRateAmount?: number;
  customRateReason?: string;
  depositAmount?: number;
  depositRefundPolicy?: string;
  withdrawalNoticeGivenDate?: string;
}

interface CreateData {
  childId: string;
  classroomId?: string;
  createdReason?: string;
  billingTerms?: CreateBillingTermsData;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacity: CapacityService,
    private readonly billingTerms: EnrollmentBillingTermsRepository,
  ) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', data.childId, () =>
        tx.child.findFirst({ where: { id: data.childId, tenantId, deletedAt: null } }),
      );

      let status: EnrollmentStatus = 'WAITLISTED';
      if (data.classroomId) {
        await this.capacity.assertCapacityAvailable(tx, tenantId, data.classroomId);
        status = 'ACTIVE';
      }

      const enrollment = await tx.enrollment.create({
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

      // Billing terms are optional at creation (see CreateEnrollmentDto) - the
      // already-shipped POST /enrollments contract stays backward-compatible
      // for callers that don't send them.
      if (data.billingTerms) {
        await this.billingTerms.openWithEnrollment(tx, tenantId, enrollment.id, data.billingTerms, createdBy);
      }

      return enrollment;
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

      await this.capacity.assertCapacityAvailable(tx, tenantId, data.newClassroomId);

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

      const newEnrollment = await tx.enrollment.create({
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

      // Lockstep with Enrollment (domain-model.md's Soft-delete cascade
      // policy): closing this Enrollment row closes its paired billing
      // terms too. A pure classroom transfer doesn't change billing terms,
      // so - unlike changeTerms - they carry forward unchanged onto the new
      // segment. No-op if this enrollment never had billing terms.
      const closedTerms = await this.billingTerms.closeWithEnrollment(tx, tenantId, id, now, updatedBy);
      if (closedTerms) {
        await this.billingTerms.openWithEnrollment(
          tx,
          tenantId,
          newEnrollment.id,
          {
            planId: closedTerms.planId ?? undefined,
            billingGuardianId: closedTerms.billingGuardianId,
            customRateAmount: closedTerms.customRateAmount ? Number(closedTerms.customRateAmount) : undefined,
            customRateReason: closedTerms.customRateReason ?? undefined,
            depositAmount: closedTerms.depositAmount ? Number(closedTerms.depositAmount) : undefined,
            depositRefundPolicy: closedTerms.depositRefundPolicy ?? undefined,
            withdrawalNoticeGivenDate: closedTerms.withdrawalNoticeGivenDate
              ? closedTerms.withdrawalNoticeGivenDate.toISOString().slice(0, 10)
              : undefined,
          },
          updatedBy,
          false, // carrying forward unchanged values - not a new assignment, so a since-deactivated Plan or soft-deleted Guardian must not block this transfer
        );
      }

      return newEnrollment;
    });
  }

  withdraw(tenantId: string, id: string, data: WithdrawData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Enrollment', id, () =>
        tx.enrollment.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      const now = new Date();

      const { count } = await tx.enrollment.updateMany({
        where: { id, endDate: null },
        data: {
          endDate: now,
          endedReason: data.reason ?? 'Withdrawn',
          status: 'WITHDRAWN',
          updatedBy,
        },
      });

      if (count === 0) {
        throw new EnrollmentConflictError('Enrollment already closed');
      }

      // Lockstep with Enrollment - a withdrawal closes billing terms too, with nothing reopening. No-op if none exist.
      await this.billingTerms.closeWithEnrollment(tx, tenantId, id, now, updatedBy);

      return findOrThrow('Enrollment', id, () => tx.enrollment.findUnique({ where: { id } }));
    });
  }
}
