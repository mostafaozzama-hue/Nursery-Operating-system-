import { Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreateFeeDto } from './dto/create-fee.dto';
import { FeeQueryDto } from './dto/fee-query.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { FeeRepository } from './fee.repository';

@Injectable()
export class FeeService {
  constructor(
    private readonly repository: FeeRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreateFeeDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId);
  }

  async findAll(query: FeeQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  /** Composable (optional tx) - primarily called by other services (PlanFeeService, later), not directly by a controller. Explicit tenantId, matching PlanPriceService.findEffective's identical convention. */
  findOneOrThrow(tenantId: string, id: string, tx?: Prisma.TransactionClient) {
    return this.repository.findOneOrThrow(tenantId, id, tx);
  }

  update(id: string, dto: UpdateFeeDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch(translateNotFound);
  }

  setActive(id: string, isActive: boolean) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.setActive(tenantId, id, isActive, userId).catch(translateNotFound);
  }
}
