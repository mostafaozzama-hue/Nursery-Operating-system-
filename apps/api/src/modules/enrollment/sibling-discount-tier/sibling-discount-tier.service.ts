import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { SetSiblingDiscountTierDto } from './dto/set-sibling-discount-tier.dto';
import { SiblingDiscountTierQueryDto } from './dto/sibling-discount-tier-query.dto';
import { SiblingDiscountTierConflictError } from './sibling-discount-tier-conflict.error';
import { SiblingDiscountTierRepository } from './sibling-discount-tier.repository';

@Injectable()
export class SiblingDiscountTierService {
  constructor(
    private readonly repository: SiblingDiscountTierRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  setTier(dto: SetSiblingDiscountTierDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.setTier(tenantId, dto, userId).catch((error) => this.translateConflict(error));
  }

  async findAll(query: SiblingDiscountTierQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  /** Composable (optional tx) - primarily called by other services (PricingEngineService, later), not directly by a controller. Explicit tenantId, matching PlanPriceService.findEffective's identical convention. */
  findEffective(tenantId: string, asOfDate: string, tx?: Prisma.TransactionClient) {
    return this.repository.findEffective(tenantId, asOfDate, tx);
  }

  private translateConflict(error: unknown): never {
    // Checked first: the brand-new-threshold race (no existing open row to
    // guard-update against) still races on the final create - this is the
    // backstop the guarded updateMany in the repository can't reach.
    if (isUniqueConstraintViolation(error)) {
      throw new ConflictException('This tier was created concurrently - please retry');
    }
    if (error instanceof SiblingDiscountTierConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
