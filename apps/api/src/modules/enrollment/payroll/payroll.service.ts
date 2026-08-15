import { ConflictException, Injectable } from '@nestjs/common';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollQueryDto } from './dto/payroll-query.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollConflictError } from './payroll-conflict.error';
import { PayrollRepository } from './payroll.repository';

@Injectable()
export class PayrollService {
  constructor(
    private readonly repository: PayrollRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreatePayrollDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('This staff member already has an active payroll record');
      }
      return this.translateError(error);
    });
  }

  async findAll(query: PayrollQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdatePayrollDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository
      .update(tenantId, id, dto, userId)
      .catch((error) => this.translateError(error));
  }

  remove(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.softDelete(tenantId, id, userId).catch(translateNotFound);
  }

  private translateError(error: unknown): never {
    if (error instanceof PayrollConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
