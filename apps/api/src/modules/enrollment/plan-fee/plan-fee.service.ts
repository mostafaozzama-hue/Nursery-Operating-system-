import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { AttachPlanFeeDto } from './dto/create-plan-fee.dto';
import { PlanFeeConflictError } from './plan-fee-conflict.error';
import { PlanFeeRepository } from './plan-fee.repository';

@Injectable()
export class PlanFeeService {
  constructor(
    private readonly repository: PlanFeeRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  attach(planId: string, dto: AttachPlanFeeDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .attach(tenantId, planId, { feeId: dto.feeId, isMandatory: dto.isMandatory ?? false }, userId)
      .catch((error) => this.translateError(error));
  }

  detach(planId: string, feeId: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.detach(tenantId, planId, feeId, userId).catch(translateNotFound);
  }

  /** Controller-facing (GET /plans/:planId/fees) - resolves tenantId internally, translates not-found. */
  findForPlan(planId: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findForPlan(tenantId, planId).catch(translateNotFound);
  }

  /** Composable (optional tx) - primarily called by other services (PricingEngineService, later), not directly by a controller. Explicit tenantId, matching PlanPriceService.findEffective's/FeeService.findOneOrThrow's identical convention. Untranslated - caller's responsibility. */
  findForPlanComposable(tenantId: string, planId: string, tx?: Prisma.TransactionClient) {
    return this.repository.findForPlan(tenantId, planId, tx);
  }

  private translateError(error: unknown): never {
    if (error instanceof PlanFeeConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
