import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { GuardianQueryDto } from './dto/guardian-query.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { GuardianConflictError } from './guardian-conflict.error';
import { GuardianRepository } from './guardian.repository';
import { GuardianValidationError } from './guardian-validation.error';

@Injectable()
export class GuardianService {
  constructor(
    private readonly repository: GuardianRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  async create(dto: CreateGuardianDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Provide at least a phone number or an email address');
    }

    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('This user is already linked to another guardian profile in this tenant');
      }
      return this.translateError(error);
    });
  }

  async findAll(query: GuardianQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdateGuardianDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('This user is already linked to another guardian profile in this tenant');
      }
      return this.translateError(error);
    });
  }

  remove(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.softDelete(tenantId, id, userId).catch(translateNotFound);
  }

  private translateError(error: unknown): never {
    if (error instanceof GuardianValidationError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof GuardianConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
