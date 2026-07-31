import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ManualOverrideService } from '../manual-override/manual-override.service';
import { InvoiceService } from '../invoice/invoice.service';
import { AddOneTimeChargeDto } from './dto/add-one-time-charge.dto';
import { OneTimeChargeConflictError } from './one-time-charge-conflict.error';
import { OneTimeChargeRepository } from './one-time-charge.repository';

const DRAFT_STATUS = 'DRAFT';

@Injectable()
export class OneTimeChargeService {
  constructor(
    private readonly repository: OneTimeChargeRepository,
    private readonly invoice: InvoiceService,
    private readonly manualOverride: ManualOverrideService,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  add(invoiceId: string, dto: AddOneTimeChargeDto) {
    const tenantId = this.currentTenant.getTenantId();
    const actorId = this.currentUser.getUserId();
    return this.repository
      .runInTransaction(tenantId, (tx) => this.addWithinTransaction(tx, tenantId, invoiceId, dto, actorId))
      .catch((error) => this.translateError(error));
  }

  private async addWithinTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    invoiceId: string,
    dto: AddOneTimeChargeDto,
    actorId: string,
  ) {
    const { lineItem, invoice } = await this.invoice.addExceptionLineItem(
      tx,
      tenantId,
      invoiceId,
      { description: dto.description, quantity: dto.quantity, unitAmount: dto.unitAmount, chargeCategory: dto.chargeCategory },
      actorId,
    );

    if (invoice.status !== DRAFT_STATUS) {
      // EXPLICIT: auditing the exception only when it touches a non-draft
      // invoice - a DRAFT invoice is still freely editable, not yet a
      // committed document needing a correction record.
      if (!dto.reasonCode) {
        throw new OneTimeChargeConflictError(
          'reasonCode is required when adding a one-time charge to a non-draft invoice',
        );
      }
      await this.manualOverride.record(
        tx,
        tenantId,
        {
          overrideType: 'ONE_TIME_CHARGE',
          reasonCode: dto.reasonCode,
          reasonNote: dto.reasonNote,
          relatedEntityType: 'InvoiceLineItem',
          relatedEntityId: lineItem.id,
          // Approved: a pure addition has no previous state to record -
          // explicit null, not omitted, per domain-model.md's own wording.
          previousValue: null,
          newValue: JSON.stringify({
            description: lineItem.description,
            unitAmount: lineItem.unitAmount.toString(),
            totalAmount: lineItem.totalAmount.toString(),
            chargeCategory: dto.chargeCategory,
          }),
        },
        actorId,
      );
    }

    return lineItem;
  }

  private translateError(error: unknown): never {
    if (error instanceof OneTimeChargeConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
