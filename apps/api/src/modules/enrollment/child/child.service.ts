import { Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../common/errors/entity-not-found.error';
import { translateNotFound } from '../../../common/errors/translate-not-found';
import { buildPaginatedResult } from '../../../common/pagination/pagination.util';
import { CurrentClassroomScopeProvider } from '../../identity/current-classroom-scope.provider';
import { CurrentUserProvider } from '../../identity/current-user.provider';
import { CurrentTenantProvider } from '../../tenancy/current-tenant.provider';
import { ChildPhotoStorageService } from './child-photo-storage.service';
import { ChildRepository } from './child.repository';
import { ChildQueryDto } from './dto/child-query.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildService {
  constructor(
    private readonly repository: ChildRepository,
    private readonly currentTenant: CurrentTenantProvider,
    private readonly currentUser: CurrentUserProvider,
    private readonly classroomScope: CurrentClassroomScopeProvider,
    private readonly photoStorage: ChildPhotoStorageService,
  ) {}

  create(dto: CreateChildDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.create(tenantId, dto, userId);
  }

  /**
   * Product Gap v2 Part 2: a classroom-scoped STAFF caller only ever sees
   * children currently enrolled in their own classroom; a STAFF caller with
   * no classroom assigned gets an empty result, never every child.
   * OWNER/ADMIN (scope === undefined) are unaffected.
   */
  async findAll(query: ChildQueryDto) {
    const tenantId = this.currentTenant.getTenantId();
    const scope = await this.classroomScope.getClassroomScope();
    if (scope === null) {
      return buildPaginatedResult([], 0, query);
    }
    const { items, total } = await this.repository.findMany(tenantId, query, scope);
    return buildPaginatedResult(items, total, query);
  }

  async findOne(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    const scope = await this.classroomScope.getClassroomScope();
    if (scope === null) {
      return translateNotFound(new EntityNotFoundError('Child', id));
    }
    return this.repository.findOneOrThrow(tenantId, id, scope).catch(translateNotFound);
  }

  update(id: string, dto: UpdateChildDto) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.update(tenantId, id, dto, userId).catch(translateNotFound);
  }

  remove(id: string) {
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    return this.repository.softDelete(tenantId, id, userId).catch(translateNotFound);
  }

  /**
   * Easy Enrollment (Product Gap H, phase 2) - local-disk MVP upload
   * (ChildPhotoStorageService's doc comment). Confirms the child exists and
   * is tenant/classroom-scope visible first (same findOne gate as any other
   * write), then saves the file and points Child.photoUrl at the stable
   * "/children/{id}/photo" reference - never the on-disk filename.
   */
  async uploadPhoto(id: string, file: { buffer: Buffer; mimetype: string }) {
    await this.findOne(id);
    const tenantId = this.currentTenant.getTenantId();
    const userId = this.currentUser.getUserId();
    const photoUrl = await this.photoStorage.save(id, file);
    return this.repository.update(tenantId, id, { photoUrl }, userId).catch(translateNotFound);
  }

  /** Same visibility gate as findOne - a caller who can't read this Child can't read their photo either. Returns null if no file has ever been uploaded (photoUrl may still be a legacy externally-pasted URL). */
  async resolvePhotoPath(id: string) {
    await this.findOne(id);
    return this.photoStorage.resolve(id);
  }
}
