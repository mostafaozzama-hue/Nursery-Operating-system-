import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { PayFrequency, PayType } from './dto/create-payroll.dto';
import { PayrollSortField } from './dto/payroll-query.dto';
import { PayrollConflictError } from './payroll-conflict.error';

interface FindManyOptions {
  page: number;
  pageSize: number;
  staffId?: string;
  payType?: PayType;
  sortBy: PayrollSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  staffId: string;
  payType: PayType;
  payRate: number;
  payFrequency: PayFrequency;
  currency: string;
  effectiveDate: string;
}

interface UpdateData {
  payType?: PayType;
  payRate?: number;
  payFrequency?: PayFrequency;
  currency?: string;
  effectiveDate?: string;
}

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, data: CreateData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Staff', data.staffId, () =>
        tx.staff.findFirst({ where: { id: data.staffId, tenantId, deletedAt: null } }),
      );

      await this.assertNoActivePayroll(tx, tenantId, data.staffId);

      return tx.staffPayroll.create({
        data: {
          tenantId,
          staffId: data.staffId,
          payType: data.payType,
          payRate: data.payRate,
          payFrequency: data.payFrequency,
          currency: data.currency,
          effectiveDate: new Date(data.effectiveDate),
          createdBy,
        },
      });
    });
  }

  findMany(tenantId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const where: Prisma.StaffPayrollWhereInput = {
        tenantId,
        deletedAt: null,
        ...(options.staffId ? { staffId: options.staffId } : {}),
        ...(options.payType ? { payType: options.payType } : {}),
      };

      const [items, total] = await Promise.all([
        tx.staffPayroll.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.staffPayroll.count({ where }),
      ]);

      return { items, total };
    });
  }

  findOneOrThrow(tenantId: string, id: string) {
    return withTenantContext(this.prisma, tenantId, (tx) =>
      findOrThrow('StaffPayroll', id, () =>
        tx.staffPayroll.findFirst({ where: { id, tenantId, deletedAt: null } }),
      ),
    );
  }

  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('StaffPayroll', id, () =>
        tx.staffPayroll.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      return tx.staffPayroll.update({
        where: { id },
        data: {
          ...data,
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
          updatedBy,
        },
      });
    });
  }

  softDelete(tenantId: string, id: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('StaffPayroll', id, () =>
        tx.staffPayroll.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      await tx.staffPayroll.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }

  /**
   * Pre-checks a deterministic "already has payroll" message; the DB partial
   * unique index (staff_payroll_tenant_staff_unique_active) remains the
   * race-safety backstop, caught generically by the caller via
   * isUniqueConstraintViolation.
   */
  private async assertNoActivePayroll(
    tx: Prisma.TransactionClient,
    tenantId: string,
    staffId: string,
  ): Promise<void> {
    const existing = await tx.staffPayroll.findFirst({
      where: { tenantId, staffId, deletedAt: null },
    });
    if (existing) {
      throw new PayrollConflictError('This staff member already has an active payroll record');
    }
  }
}
