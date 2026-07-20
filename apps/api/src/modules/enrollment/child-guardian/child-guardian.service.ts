import { ConflictException, Injectable } from '@nestjs/common';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildGuardianConflictError } from './child-guardian-conflict.error';
import { ChildGuardianRepository } from './child-guardian.repository';
import { ChildGuardianQueryDto } from './dto/child-guardian-query.dto';
import { CreateChildGuardianDto } from './dto/create-child-guardian.dto';
import { UpdateChildGuardianDto } from './dto/update-child-guardian.dto';

@Injectable()
export class ChildGuardianService {
  constructor(
    private readonly repository: ChildGuardianRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreateChildGuardianDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId).catch((error) => this.translateError(error));
  }

  async findAll(query: ChildGuardianQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdateChildGuardianDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch((error) => this.translateError(error));
  }

  remove(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.softDelete(tenantId, id, userId).catch(translateNotFound);
  }

  private translateError(error: unknown): never {
    if (isUniqueConstraintViolation(error)) {
      throw new ConflictException('This link could not be created due to a conflicting record - please retry');
    }
    if (error instanceof ChildGuardianConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
