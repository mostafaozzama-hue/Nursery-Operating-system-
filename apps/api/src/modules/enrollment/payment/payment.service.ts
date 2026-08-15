import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PaymentAllocationError } from '../payment-allocation/payment-allocation.error';
import { PaymentAllocationService } from '../payment-allocation/payment-allocation.service';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentRepository } from './payment.repository';

@Injectable()
export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly paymentAllocation: PaymentAllocationService,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  record(guardianId: string, dto: RecordPaymentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const actorId = this.currentUser.getUserId();
    return this.repository
      .runInTransaction(tenantId, (tx) => this.recordWithinTransaction(tx, tenantId, guardianId, dto, actorId))
      .catch((error) => this.translateError(error));
  }

  private async recordWithinTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    guardianId: string,
    dto: RecordPaymentDto,
    actorId: string,
  ) {
    const payment = await this.repository.createComposable(tx, tenantId, guardianId, dto, actorId);
    await this.paymentAllocation.allocate(tx, tenantId, payment.id, guardianId, payment.amount.toString(), actorId);
    return payment;
  }

  async findForGuardian(guardianId: string, query: PaymentQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository
      .findForGuardian(tenantId, guardianId, query)
      .catch(translateNotFound);
    return buildPaginatedResult(items, total, query);
  }

  private translateError(error: unknown): never {
    if (error instanceof PaymentAllocationError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
