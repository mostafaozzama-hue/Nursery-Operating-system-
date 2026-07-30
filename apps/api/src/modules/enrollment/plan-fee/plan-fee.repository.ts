import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { PlanFeeConflictError } from './plan-fee-conflict.error';

interface AttachData {
  feeId: string;
  isMandatory: boolean;
}

@Injectable()
export class PlanFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks Plan and Fee existence via direct inline Prisma queries, not a
   * call through PlanService/FeeService - matches the established
   * codebase precedent (PlanPriceRepository checking Plan, ChildGuardianRepository
   * checking Child+Guardian), not the design doc's more general §10 prose,
   * which no shipped repository actually follows for this shape yet.
   */
  attach(tenantId: string, planId: string, data: AttachData, createdBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Plan', planId, () => tx.plan.findFirst({ where: { id: planId, tenantId, deletedAt: null } }));
      await findOrThrow('Fee', data.feeId, () =>
        tx.fee.findFirst({ where: { id: data.feeId, tenantId, deletedAt: null } }),
      );

      const existingPairing = await tx.planFee.findFirst({
        where: { tenantId, planId, feeId: data.feeId, deletedAt: null },
      });
      if (existingPairing) {
        throw new PlanFeeConflictError('This Fee is already attached to this Plan');
      }

      return tx.planFee.create({
        data: {
          tenantId,
          planId,
          feeId: data.feeId,
          isMandatory: data.isMandatory,
          createdBy,
        },
      });
    });
  }

  detach(tenantId: string, planId: string, feeId: string, deletedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const pairing = await findOrThrow('PlanFee', `${planId}:${feeId}`, () =>
        tx.planFee.findFirst({ where: { tenantId, planId, feeId, deletedAt: null } }),
      );

      await tx.planFee.update({
        where: { id: pairing.id },
        data: { deletedAt: new Date(), deletedBy },
      });
    });
  }

  /**
   * Composable (optional tx) - the Plan-existence check (404 on a bogus
   * planId, matching PlanPriceRepository.findMany's identical precedent)
   * always runs, tx or not, since the caller's tx already covers it.
   */
  findForPlan(tenantId: string, planId: string, tx?: Prisma.TransactionClient) {
    const run = async (client: Prisma.TransactionClient) => {
      await findOrThrow('Plan', planId, () =>
        client.plan.findFirst({ where: { id: planId, tenantId, deletedAt: null } }),
      );
      return client.planFee.findMany({ where: { tenantId, planId, deletedAt: null } });
    };
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }
}
