import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { PrismaService } from '../../../prisma/prisma.service';

interface CreateCreditNoteComposableData {
  invoiceId: string;
  guardianId: string;
  amount: Prisma.Decimal | string;
  reasonCode: string;
}

/**
 * Deliberately minimal - only the recording capability
 * WaiverService.applyRetroactively needs, per the same "build only what's
 * needed" instruction already applied to ManualOverrideService.
 * applyToInvoice/refund/findForGuardian are not implemented; nothing
 * calls them yet.
 */
@Injectable()
export class CreditNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Composable - never opens its own transaction, always runs inside the caller's (WaiverService.applyRetroactively). */
  async createComposable(tx: Prisma.TransactionClient, tenantId: string, data: CreateCreditNoteComposableData, actorId: string) {
    const creditNoteNumber = await this.nextCreditNoteNumber(tx, tenantId);
    return tx.creditNote.create({
      data: {
        tenantId,
        invoiceId: data.invoiceId,
        guardianId: data.guardianId,
        amount: new Prisma.Decimal(data.amount),
        reasonCode: data.reasonCode,
        creditNoteNumber,
        createdBy: actorId,
      },
    });
  }

  /**
   * Placeholder sequential numbering (CN-<year>-<count+1>), same shape as
   * InvoiceRepository.nextInvoiceNumber - not the real Configuration
   * Engine numbering service, which is separate, later work. Locking the
   * tenant row serializes concurrent credit note creation for that
   * tenant within this transaction, same FOR UPDATE pattern.
   */
  private async nextCreditNoteNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId}::uuid FOR UPDATE`;
    const count = await tx.creditNote.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `CN-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
