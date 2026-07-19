import { UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { JwtUserProvider } from './jwt-user.provider';

describe('JwtUserProvider', () => {
  it('returns sub (userId) from the authenticated request', () => {
    const request = {
      user: { sub: 'user-1', tenantId: 'tenant-1' },
    } as unknown as AuthenticatedRequest;

    const provider = new JwtUserProvider(request);

    expect(provider.getUserId()).toBe('user-1');
  });

  it('throws UnauthorizedException when request.user is missing', () => {
    const request = { user: undefined } as unknown as AuthenticatedRequest;
    const provider = new JwtUserProvider(request);

    expect(() => provider.getUserId()).toThrow(UnauthorizedException);
  });
});
