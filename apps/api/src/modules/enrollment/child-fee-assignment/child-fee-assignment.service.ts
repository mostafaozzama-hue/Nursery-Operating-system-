import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildFeeAssignmentConflictError } from './child-fee-assignment-conflict.error';
import { ChildFeeAssignmentRepository } from './child-fee-assignment.repository';
import { AssignChildFeeDto } from './dto/assign-child-fee.dto';
import { ChildFeeAssignmentQueryDto } from './dto/child-fee-assignment-query.dto';
import { UnassignChildFeeDto } from './dto/unassign-child-fee.dto';

@Injectable()
export class ChildFeeAssignmentService {
  constructor(
    private readonly repository: ChildFeeAssignmentRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  assign(childId: string, dto: AssignChildFeeDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .assign(tenantId, childId, dto, userId)
      .catch((error) => this.translateConflict(error));
  }

  unassign(childId: string, feeId: string, dto: UnassignChildFeeDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .unassign(tenantId, childId, feeId, dto.effectiveTo, userId)
      .catch((error) => this.translateConflict(error));
  }

  async findForChild(childId: string, query: ChildFeeAssignmentQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository
      .findForChild(tenantId, childId, query)
      .catch(translateNotFound);
    return buildPaginatedResult(items, total, query);
  }

  /** Composable (optional tx) - primarily called by other services (PricingEngineService, later), not directly by a controller. Explicit tenantId, matching PlanPriceService.findEffective's/SiblingDiscountTierService.findEffective's identical convention. Untranslated - caller's responsibility. */
  findEffectiveForPeriod(tenantId: string, childId: string, periodStart: string, periodEnd: string, tx?: Prisma.TransactionClient) {
    return this.repository.findEffectiveForPeriod(tenantId, childId, periodStart, periodEnd, tx);
  }

  private translateConflict(error: unknown): never {
    if (error instanceof ChildFeeAssignmentConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
