import { Injectable } from '@nestjs/common';
import { CurrentTenantProvider } from './current-tenant.provider';

/**
 * Development-only implementation. Returns a tenant id configured through
 * environment configuration - never a client-supplied header, query param,
 * or body field. To be replaced by a JWT-derived implementation once
 * Identity's auth flow exists; nothing outside this file changes when that
 * happens.
 */
@Injectable()
export class FixedTenantProvider extends CurrentTenantProvider {
  getTenantId(): string {
    const tenantId = process.env.DEV_TENANT_ID;

    if (!tenantId) {
      throw new Error(
        'DEV_TENANT_ID is not configured. Set it in .env to a real tenant id.',
      );
    }

    return tenantId;
  }
}
