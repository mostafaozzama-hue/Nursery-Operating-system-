import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreateWaiverDto } from './dto/create-waiver.dto';
import { UpdateWaiverDto } from './dto/update-waiver.dto';
import { WaiverQueryDto } from './dto/waiver-query.dto';
import { WaiverConflictError } from './waiver-conflict.error';
import { WaiverRepository } from './waiver.repository';

@Injectable()
export class WaiverService {
  constructor(
    private readonly repository: WaiverRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(childId: string, dto: CreateWaiverDto) {
    const tenantId = this.currentTenant.getTenantId();
    const approvedBy = this.currentUser.getUserId();
    return this.repository.create(tenantId, childId, dto, approvedBy).catch((error) => this.translateConflict(error));
  }

  update(id: string, dto: UpdateWaiverDto) {
    const tenantId = this.currentTenant.getTenantId();
    const updatedBy = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, updatedBy).catch((error) => this.translateConflict(error));
  }

  async findForChild(childId: string, query: WaiverQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findForChild(tenantId, childId, query).catch(translateNotFound);
    return buildPaginatedResult(items, total, query);
  }

  /** Composable (optional tx) - primarily called by PricingEngineService, later. Explicit tenantId, matching ChildFeeAssignmentService/ChildDiscountAssignmentService's identical convention. Untranslated - caller's responsibility. */
  findEffectiveForPeriod(tenantId: string, childId: string, periodStart: string, periodEnd: string, tx?: Prisma.TransactionClient) {
    return this.repository.findEffectiveForPeriod(tenantId, childId, periodStart, periodEnd, tx);
  }

  private translateConflict(error: unknown): never {
    if (error instanceof WaiverConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
