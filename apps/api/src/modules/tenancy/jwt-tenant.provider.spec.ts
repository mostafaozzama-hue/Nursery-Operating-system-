import { UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '../identity/types/authenticated-request';
import { JwtTenantProvider } from './jwt-tenant.provider';

describe('JwtTenantProvider', () => {
  it('returns tenantId from the authenticated request', () => {
    const request = {
      user: { tenantId: 'tenant-1', sub: 'user-1' },
    } as unknown as AuthenticatedRequest;

    const provider = new JwtTenantProvider(request);

    expect(provider.getTenantId()).toBe('tenant-1');
  });

  it('throws UnauthorizedException when request.user is missing', () => {
    const request = { user: undefined } as unknown as AuthenticatedRequest;
    const provider = new JwtTenantProvider(request);

    expect(() => provider.getTenantId()).toThrow(UnauthorizedException);
  });
});
