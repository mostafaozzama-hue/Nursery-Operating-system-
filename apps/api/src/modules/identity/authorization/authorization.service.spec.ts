import { JwtPayload } from '../types/authenticated-request';
import { AuthorizationService } from './authorization.service';

function user(role: string): JwtPayload {
  return {
    sub: 'user-1',
    membershipId: 'membership-1',
    tenantId: 'tenant-1',
    role,
    tokenVersion: 0,
    email: 'a@b.com',
    jti: 'jti-1',
    iat: 0,
    exp: 0,
  };
}

describe('AuthorizationService', () => {
  const service = new AuthorizationService();

  it('authorizes a user whose role is in anyOfRoles', () => {
    expect(service.isAuthorized(user('OWNER'), { anyOfRoles: ['OWNER', 'ADMIN'] })).toBe(true);
  });

  it('rejects a user whose role is not in anyOfRoles', () => {
    expect(service.isAuthorized(user('STAFF'), { anyOfRoles: ['OWNER', 'ADMIN'] })).toBe(false);
  });

  it('rejects when anyOfRoles is empty', () => {
    expect(service.isAuthorized(user('OWNER'), { anyOfRoles: [] })).toBe(false);
  });

  it('is case-sensitive on role matching', () => {
    expect(service.isAuthorized(user('owner'), { anyOfRoles: ['OWNER'] })).toBe(false);
  });
});
