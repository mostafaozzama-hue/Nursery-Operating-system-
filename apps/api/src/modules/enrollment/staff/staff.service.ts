import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InactiveMembershipError } from '../../../common/errors/inactive-membership.error';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffQueryDto } from './dto/staff-query.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffConflictError } from './staff-conflict.error';
import { StaffRepository } from './staff.repository';

@Injectable()
export class StaffService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreateStaffDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('This user is already linked to another staff profile in this tenant');
      }
      return this.translateError(error);
    });
  }

  async findAll(query: StaffQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdateStaffDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('This user is already linked to another staff profile in this tenant');
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
    if (error instanceof InactiveMembershipError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof StaffConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
