import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildDiscountAssignmentConflictError } from './child-discount-assignment-conflict.error';
import { ChildDiscountAssignmentRepository } from './child-discount-assignment.repository';
import { AssignChildDiscountDto } from './dto/assign-child-discount.dto';
import { ChildDiscountAssignmentQueryDto } from './dto/child-discount-assignment-query.dto';
import { ExpireChildDiscountDto } from './dto/expire-child-discount.dto';

@Injectable()
export class ChildDiscountAssignmentService {
  constructor(
    private readonly repository: ChildDiscountAssignmentRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  assign(childId: string, discountId: string, dto: AssignChildDiscountDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .assign(tenantId, childId, { discountId, ...dto }, userId)
      .catch((error) => this.translateConflict(error));
  }

  expire(childId: string, discountId: string, dto: ExpireChildDiscountDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .expire(tenantId, childId, discountId, dto.effectiveTo, userId)
      .catch((error) => this.translateConflict(error));
  }

  async findForChild(childId: string, query: ChildDiscountAssignmentQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findForChild(tenantId, childId, query).catch(translateNotFound);
    return buildPaginatedResult(items, total, query);
  }

  /** Composable (optional tx) - primarily called by other services (PricingEngineService, later), not directly by a controller. Explicit tenantId, matching PlanPriceService.findEffective's/ChildFeeAssignmentService.findEffectiveForPeriod's identical convention. Untranslated - caller's responsibility. */
  findEffectiveForPeriod(tenantId: string, childId: string, periodStart: string, periodEnd: string, tx?: Prisma.TransactionClient) {
    return this.repository.findEffectiveForPeriod(tenantId, childId, periodStart, periodEnd, tx);
  }

  private translateConflict(error: unknown): never {
    if (error instanceof ChildDiscountAssignmentConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
