import { ConflictException, Injectable } from '@nestjs/common';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { EnrollmentConflictError } from './enrollment-conflict.error';
import { EnrollmentRepository } from './enrollment.repository';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { TransferEnrollmentDto } from './dto/transfer-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { WithdrawEnrollmentDto } from './dto/withdraw-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly repository: EnrollmentRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  create(dto: CreateEnrollmentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId).catch((error) => {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Child already has an active enrollment');
      }
      return this.translateConflict(error);
    });
  }

  async findAll(query: EnrollmentQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdateEnrollmentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch(translateNotFound);
  }

  transfer(id: string, dto: TransferEnrollmentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.transfer(tenantId, id, dto, userId).catch((error) => this.translateConflict(error));
  }

  withdraw(id: string, dto: WithdrawEnrollmentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.withdraw(tenantId, id, dto, userId).catch((error) => this.translateConflict(error));
  }

  private translateConflict(error: unknown): never {
    if (error instanceof EnrollmentConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
