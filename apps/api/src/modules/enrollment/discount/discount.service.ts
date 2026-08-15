import { Injectable } from '@nestjs/common';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { DiscountQueryDto } from './dto/discount-query.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountRepository } from './discount.repository';

@Injectable()
export class DiscountService {
  constructor(
    private readonly repository: DiscountRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreateDiscountDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(
      tenantId,
      { name: dto.name, type: dto.type, amount: dto.amount, stackable: dto.stackable ?? false, scope: dto.scope ?? 'BASE_TUITION_ONLY' },
      userId,
    );
  }

  async findAll(query: DiscountQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdateDiscountDto) {
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
