import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { PlanPriceQueryDto } from './dto/plan-price-query.dto';
import { SetPlanPriceDto } from './dto/set-plan-price.dto';
import { PlanPriceConflictError } from './plan-price-conflict.error';
import { PlanPriceRepository } from './plan-price.repository';

@Injectable()
export class PlanPriceService {
  constructor(
    private readonly repository: PlanPriceRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  setPrice(planId: string, dto: SetPlanPriceDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.setPrice(tenantId, planId, dto, userId).catch((error) => this.translateConflict(error));
  }

  async findHistory(planId: string, query: PlanPriceQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository
      .findMany(tenantId, planId, query)
      .catch((error) => this.translateConflict(error));
    return buildPaginatedResult(items, total, query);
  }

  /** Composable (optional tx) - primarily called by other services (PricingEngineService, later), not directly by a controller. Explicit tenantId, matching EnrollmentBillingTermsService.findEffectiveForPeriod's convention. */
  findEffective(tenantId: string, planId: string, asOfDate: string, tx?: Prisma.TransactionClient) {
    return this.repository.findEffective(tenantId, planId, asOfDate, tx);
  }

  private translateConflict(error: unknown): never {
    if (error instanceof PlanPriceConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
