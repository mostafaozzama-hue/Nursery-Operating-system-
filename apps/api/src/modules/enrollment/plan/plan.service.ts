import { Injectable } from '@nestjs/common';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanRepository } from './plan.repository';

@Injectable()
export class PlanService {
  constructor(
    private readonly repository: PlanRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreatePlanDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId);
  }

  async findAll(query: PlanQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdatePlanDto) {
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
