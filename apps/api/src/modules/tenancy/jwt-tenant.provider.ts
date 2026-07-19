import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthenticatedRequest } from '../identity/types/authenticated-request';
import { CurrentTenantProvider } from './current-tenant.provider';

/**
 * Reads tenantId from the JWT claims JwtAuthGuard already verified and
 * attached to the request. Replaces FixedTenantProvider - this is the only
 * file that changed; Classroom's controller/service/repository did not.
 */
@Injectable({ scope: Scope.REQUEST })
export class JwtTenantProvider extends CurrentTenantProvider {
  constructor(@Inject(REQUEST) private readonly request: AuthenticatedRequest) {
    super();
  }

  getTenantId(): string {
    if (!this.request.user) {
      throw new UnauthorizedException('No authenticated request context');
    }
    return this.request.user.tenantId;
  }
}
