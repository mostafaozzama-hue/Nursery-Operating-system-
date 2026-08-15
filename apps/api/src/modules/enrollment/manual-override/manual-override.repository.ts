import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { RecordOverrideInput } from './record-override-input.type';

/**
 * Deliberately minimal - only the recording capability OneTimeChargeService
 * needs, per explicit instruction not to expand into the full
 * ManualOverride feature set (findForEntity, a controller, query/response
 * DTOs) until something actually requires it.
 */
@Injectable()
export class ManualOverrideRepository {
  /** Never opens its own transaction - the row must commit atomically with whatever it audits. */
  record(tx: Prisma.TransactionClient, tenantId: string, data: RecordOverrideInput, actorId: string) {
    return tx.manualOverride.create({
      data: {
        tenantId,
        overrideType: data.overrideType,
        reasonCode: data.reasonCode,
        reasonNote: data.reasonNote,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        previousValue: data.previousValue,
        newValue: data.newValue,
        appliedBy: actorId,
        appliedAt: new Date(),
        createdBy: actorId,
      },
    });
  }
}
