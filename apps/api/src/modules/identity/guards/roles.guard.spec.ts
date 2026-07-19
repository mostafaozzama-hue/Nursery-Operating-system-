import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../authorization/authorization.service';
import { RolesGuard } from './roles.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let authorization: { isAuthorized: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    authorization = { isAuthorized: jest.fn() };
    guard = new RolesGuard(
      reflector as unknown as Reflector,
      authorization as unknown as AuthorizationService,
    );
  });

  it('allows the request when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext({ role: 'STAFF' });

    expect(guard.canActivate(context)).toBe(true);
    expect(authorization.isAuthorized).not.toHaveBeenCalled();
  });

  it('allows the request when the required roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = makeContext({ role: 'STAFF' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when roles are required but there is no user', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    const context = makeContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('delegates the decision to AuthorizationService and allows when authorized', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER', 'ADMIN']);
    authorization.isAuthorized.mockReturnValue(true);
    const user = { role: 'ADMIN' };
    const context = makeContext(user);

    expect(guard.canActivate(context)).toBe(true);
    expect(authorization.isAuthorized).toHaveBeenCalledWith(user, { anyOfRoles: ['OWNER', 'ADMIN'] });
  });

  it('throws ForbiddenException when AuthorizationService rejects', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    authorization.isAuthorized.mockReturnValue(false);
    const context = makeContext({ role: 'STAFF' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
