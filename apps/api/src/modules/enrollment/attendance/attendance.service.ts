import { ConflictException, Injectable } from '@nestjs/common';
import { isUniqueConstraintViolation } from '../../../common/errors/is-unique-constraint-violation';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { AttendanceConflictError } from './attendance-conflict.error';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkAbsentDto } from './dto/mark-absent.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
  ) {}

  checkIn(dto: CheckInDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.checkIn(tenantId, dto, userId).catch((error) => this.translateError(error));
  }

  checkOut(id: string, dto: CheckOutDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.checkOut(tenantId, id, dto, userId).catch((error) => this.translateError(error));
  }

  markAbsent(dto: MarkAbsentDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.markAbsent(tenantId, dto, userId).catch((error) => this.translateError(error));
  }

  async findAll(query: AttendanceQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);
    return buildPaginatedResult(items, total, query);
  }

  findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch(translateNotFound);
  }

  update(id: string, dto: UpdateAttendanceDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch((error) => this.translateError(error));
  }

  private translateError(error: unknown): never {
    if (isUniqueConstraintViolation(error)) {
      throw new ConflictException('This child already has an attendance record for that day');
    }
    if (error instanceof AttendanceConflictError) {
      throw new ConflictException(error.message);
    }
    return translateNotFound(error);
  }
}
