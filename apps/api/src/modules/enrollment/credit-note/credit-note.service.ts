import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { CreditNoteRepository } from './credit-note.repository';

@Injectable()
export class CreditNoteService {
  constructor(private readonly repository: CreditNoteRepository) {}

  /** Composable, never opens its own transaction - explicit tenantId, matching every other composable method's convention. */
  createComposable(
    tx: Prisma.TransactionClient,
    tenantId: string,
    data: { invoiceId: string; guardianId: string; amount: Prisma.Decimal | string; reasonCode: string },
    actorId: string,
  ) {
    return this.repository.createComposable(tx, tenantId, data, actorId);
  }
}
