import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { ManualOverrideRepository } from './manual-override.repository';
import { RecordOverrideInput } from './record-override-input.type';

@Injectable()
export class ManualOverrideService {
  constructor(private readonly repository: ManualOverrideRepository) {}

  /** Composable, never opens its own transaction - explicit tenantId, matching every other composable method's convention. */
  record(tx: Prisma.TransactionClient, tenantId: string, data: RecordOverrideInput, actorId: string) {
    return this.repository.record(tx, tenantId, data, actorId);
  }
}
