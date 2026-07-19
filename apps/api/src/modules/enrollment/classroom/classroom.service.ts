import { Injectable, NotFoundException } from '@nestjs/common';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ClassroomNotFoundError, ClassroomRepository } from './classroom.repository';
import { ClassroomQueryDto } from './dto/classroom-query.dto';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Injectable()
export class ClassroomService {
  constructor(
    private readonly repository: ClassroomRepository,
    private readonly currentTenant: CurrentTenantProvider,
  ) {}

  create(dto: CreateClassroomDto) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.create(tenantId, dto);
  }

  async findAll(query: ClassroomQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const { items, total } = await this.repository.findMany(tenantId, query);

    return {
      data: items,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.findOneOrThrow(tenantId, id).catch((error) => {
      throw this.translate(error);
    });
  }

  async update(id: string, dto: UpdateClassroomDto) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.update(tenantId, id, dto).catch((error) => {
      throw this.translate(error);
    });
  }

  async remove(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    return this.repository.softDelete(tenantId, id).catch((error) => {
      throw this.translate(error);
    });
  }

  private translate(error: unknown): unknown {
    if (error instanceof ClassroomNotFoundError) {
      return new NotFoundException(error.message);
    }
    return error;
  }
}
