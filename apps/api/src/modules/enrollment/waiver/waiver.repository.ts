import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { findOrThrow } from '../../../common/repository/find-or-throw';
import { PrismaService } from '../../../prisma/prisma.service';
import { withTenantContext } from '../../tenancy/with-tenant-context';
import { WaiverConflictError } from './waiver-conflict.error';
import { WaiverSortField } from './dto/waiver-query.dto';
import { WaiverReasonCode } from './dto/waiver-reason-code';
import { WaiverType } from './dto/waiver-type';

interface FindManyOptions {
  page: number;
  pageSize: number;
  sortBy: WaiverSortField;
  sortOrder: 'asc' | 'desc';
}

interface CreateData {
  type: WaiverType;
  percentage: number;
  reasonCode: WaiverReasonCode;
  reasonNote?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  reviewAnnually?: boolean;
}

interface UpdateData {
  percentage?: number;
  reasonCode?: WaiverReasonCode;
  reasonNote?: string | null;
  effectiveTo?: string | null;
  reviewAnnually?: boolean;
}

@Injectable()
export class WaiverRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, childId: string, data: CreateData, approvedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', childId, () =>
        tx.child.findFirst({ where: { id: childId, tenantId, deletedAt: null } }),
      );

      const effectiveFrom = new Date(data.effectiveFrom.slice(0, 10));
      const effectiveTo = data.effectiveTo ? new Date(data.effectiveTo.slice(0, 10)) : undefined;
      const reviewAnnually = data.reviewAnnually ?? false;

      // effectiveTo-or-reviewAnnually is also enforced by the DB CHECK
      // waivers_review_or_expiry_required - this app-layer check exists to
      // return a clean 409 instead of a raw constraint-violation 500.
      if (!effectiveTo && !reviewAnnually) {
        throw new WaiverConflictError('effectiveTo must be set unless reviewAnnually is true');
      }
      if (effectiveTo && effectiveTo <= effectiveFrom) {
        throw new WaiverConflictError('effectiveTo must be after effectiveFrom');
      }
      if (data.reasonCode === 'OTHER' && !data.reasonNote) {
        throw new WaiverConflictError('reasonNote is required when reasonCode is OTHER');
      }

      return tx.waiver.create({
        data: {
          tenantId,
          childId,
          type: data.type,
          percentage: data.percentage,
          reasonCode: data.reasonCode,
          reasonNote: data.reasonNote,
          effectiveFrom,
          effectiveTo,
          reviewAnnually,
          approvedBy,
          createdBy: approvedBy,
        },
      });
    });
  }

  /**
   * Validates the MERGED final state (current row + this patch applied),
   * not just the patch payload in isolation - per explicit instruction.
   * A PATCH that only sends {reasonCode: 'OTHER'} without also resending
   * an existing reasonNote must still be rejected if the row would end up
   * with no reasonNote; a PATCH that only sends {reviewAnnually: false}
   * must be rejected if the row has no effectiveTo either. DTO-level
   * @ValidateIf on UpdateWaiverDto can only ever see the current payload,
   * never the stored row, so this merge-then-validate step has to live
   * here, not in the DTO - the same structural limitation Discount's
   * percentage cap and Holiday's earlyCloseTime accepted is deliberately
   * NOT accepted for Waiver, by explicit instruction.
   */
  update(tenantId: string, id: string, data: UpdateData, updatedBy: string) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      const current = await findOrThrow('Waiver', id, () =>
        tx.waiver.findFirst({ where: { id, tenantId, deletedAt: null } }),
      );

      const mergedReasonCode = data.reasonCode !== undefined ? data.reasonCode : current.reasonCode;
      const mergedReasonNote = data.reasonNote !== undefined ? data.reasonNote : current.reasonNote;
      const mergedEffectiveTo =
        data.effectiveTo !== undefined
          ? data.effectiveTo === null
            ? null
            : new Date(data.effectiveTo.slice(0, 10))
          : current.effectiveTo;
      const mergedReviewAnnually = data.reviewAnnually !== undefined ? data.reviewAnnually : current.reviewAnnually;

      if (!mergedEffectiveTo && !mergedReviewAnnually) {
        throw new WaiverConflictError('effectiveTo must be set unless reviewAnnually is true');
      }
      if (mergedEffectiveTo && mergedEffectiveTo <= current.effectiveFrom) {
        throw new WaiverConflictError("effectiveTo must be after this Waiver's own effectiveFrom");
      }
      if (mergedReasonCode === 'OTHER' && !mergedReasonNote) {
        throw new WaiverConflictError('reasonNote is required when reasonCode is OTHER');
      }

      return tx.waiver.update({
        where: { id },
        data: {
          percentage: data.percentage,
          reasonCode: data.reasonCode,
          reasonNote: data.reasonNote,
          effectiveTo: data.effectiveTo === undefined ? undefined : mergedEffectiveTo,
          reviewAnnually: data.reviewAnnually,
          updatedBy,
        },
      });
    });
  }

  findForChild(tenantId: string, childId: string, options: FindManyOptions) {
    return withTenantContext(this.prisma, tenantId, async (tx) => {
      await findOrThrow('Child', childId, () =>
        tx.child.findFirst({ where: { id: childId, tenantId, deletedAt: null } }),
      );

      const where: Prisma.WaiverWhereInput = { tenantId, childId, deletedAt: null };

      const [items, total] = await Promise.all([
        tx.waiver.findMany({
          where,
          orderBy: { [options.sortBy]: options.sortOrder },
          skip: (options.page - 1) * options.pageSize,
          take: options.pageSize,
        }),
        tx.waiver.count({ where }),
      ]);

      return { items, total };
    });
  }

  /**
   * Period-overlap resolution, matching the same billing-period invariant
   * as every other findEffectiveForPeriod in this codebase. Composable
   * (optional tx) - primarily called by PricingEngineService, later. No
   * Child-existence check here, unlike findForChild - the caller has
   * already validated childId upstream, and an empty array (no waivers)
   * is a valid result, not an error.
   */
  findEffectiveForPeriod(
    tenantId: string,
    childId: string,
    periodStart: string,
    periodEnd: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = (client: Prisma.TransactionClient) => {
      const periodStartValue = new Date(periodStart.slice(0, 10));
      const periodEndValue = new Date(periodEnd.slice(0, 10));
      return client.waiver.findMany({
        where: {
          tenantId,
          childId,
          deletedAt: null,
          effectiveFrom: { lte: periodEndValue },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStartValue } }],
        },
        orderBy: { effectiveFrom: 'asc' },
      });
    };
    return tx ? run(tx) : withTenantContext(this.prisma, tenantId, run);
  }
}
