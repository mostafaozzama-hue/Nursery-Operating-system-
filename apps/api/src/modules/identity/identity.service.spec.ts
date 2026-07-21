import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@nursery-os/database';
import * as argon2 from 'argon2';
import { Response } from 'express';
import { IdentityRepository } from './identity.repository';
import { AuthService } from './identity.service';
import { TokenService } from './token.service';

jest.mock('argon2');

function mockResponse(): jest.Mocked<Response> {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as jest.Mocked<Response>;
}

const activeMembership = {
  id: 'membership-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  roleId: 'role-1',
  status: 'ACTIVE',
  role: { id: 'role-1', key: 'OWNER', name: 'Owner' },
};

const user = {
  id: 'user-1',
  email: 'owner@barney.test',
  passwordHash: 'hashed',
  status: 'ACTIVE',
  tokenVersion: 0,
};

describe('AuthService', () => {
  let repository: jest.Mocked<IdentityRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let service: AuthService;
  let res: jest.Mocked<Response>;

  beforeEach(() => {
    repository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      findActiveMembershipsForUser: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeAllActiveRefreshTokensForUser: jest.fn(),
      revokeRefreshTokenById: jest.fn(),
      invalidateUnusedPasswordResetTokensForUser: jest.fn(),
      createPasswordResetToken: jest.fn(),
      findPasswordResetTokenByHash: jest.fn(),
      markPasswordResetTokenUsedIfUnused: jest.fn(),
      updateUserPasswordAndBumpTokenVersion: jest.fn(),
      findSystemRoleId: jest.fn(),
      registerTenantOwner: jest.fn(),
    } as unknown as jest.Mocked<IdentityRepository>;

    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue('signed-access-token'),
      generateRefreshToken: jest
        .fn()
        .mockReturnValue({ token: 'raw-refresh-token', hash: 'hashed-refresh-token' }),
      hashToken: jest.fn().mockReturnValue('hashed-refresh-token'),
      refreshTokenExpiresAt: jest.fn().mockReturnValue(new Date(Date.now() + 1000)),
      accessTokenTtlMs: jest.fn().mockReturnValue(900_000),
      refreshTokenTtlMs: jest.fn().mockReturnValue(2_592_000_000),
    } as unknown as jest.Mocked<TokenService>;

    service = new AuthService(repository, tokenService);
    res = mockResponse();
    process.env.COOKIE_SECURE = 'false';
    jest.clearAllMocks();
    (argon2.verify as jest.Mock).mockReset();
    (argon2.hash as jest.Mock).mockReset();
  });

  describe('register', () => {
    const ownerRole = { id: 'role-1', key: 'OWNER', name: 'Owner', tenantId: null };
    const registerResult = {
      tenant: { id: 'tenant-1', name: 'Barney Home Nursery' },
      user: { id: 'user-1', email: 'owner@barney.test', tokenVersion: 0 },
      membership: { id: 'membership-1', tenantId: 'tenant-1', userId: 'user-1' },
    };

    it('bootstraps a tenant + OWNER user + membership and issues tokens', async () => {
      repository.findSystemRoleId.mockResolvedValue(ownerRole as never);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      repository.registerTenantOwner.mockResolvedValue(registerResult as never);

      const profile = await service.register(
        { tenantName: 'Barney Home Nursery', email: 'owner@barney.test', password: 'CorrectHorseBattery1' },
        res,
      );

      expect(repository.findSystemRoleId).toHaveBeenCalledWith('OWNER');
      expect(argon2.hash).toHaveBeenCalledWith('CorrectHorseBattery1');
      expect(repository.registerTenantOwner).toHaveBeenCalledWith({
        tenantName: 'Barney Home Nursery',
        email: 'owner@barney.test',
        passwordHash: 'hashed-password',
        roleId: 'role-1',
      });
      expect(profile).toEqual({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'OWNER',
        email: 'owner@barney.test',
      });
      expect(repository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', tokenVersion: 0 }),
      );
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'signed-access-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'raw-refresh-token', expect.any(Object));
    });

    it('translates a duplicate email into a 409 Conflict, not a raw database error', async () => {
      repository.findSystemRoleId.mockResolvedValue(ownerRole as never);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      repository.registerTenantOwner.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(
        service.register(
          { tenantName: 'Barney Home Nursery', email: 'owner@barney.test', password: 'CorrectHorseBattery1' },
          res,
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.register(
          { tenantName: 'Barney Home Nursery', email: 'owner@barney.test', password: 'CorrectHorseBattery1' },
          res,
        ),
      ).rejects.toThrow('Email already in use');
    });

    it('propagates unrelated errors unchanged (not swallowed as a conflict)', async () => {
      repository.findSystemRoleId.mockResolvedValue(ownerRole as never);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      repository.registerTenantOwner.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.register(
          { tenantName: 'Barney Home Nursery', email: 'owner@barney.test', password: 'CorrectHorseBattery1' },
          res,
        ),
      ).rejects.toThrow('connection lost');
    });

    it('throws if the OWNER system role is not seeded', async () => {
      repository.findSystemRoleId.mockResolvedValue(null as never);

      await expect(
        service.register(
          { tenantName: 'Barney Home Nursery', email: 'owner@barney.test', password: 'CorrectHorseBattery1' },
          res,
        ),
      ).rejects.toThrow('OWNER system role is not seeded');
      expect(repository.registerTenantOwner).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('succeeds with correct credentials and issues tokens', async () => {
      repository.findUserByEmail.mockResolvedValue(user as never);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      repository.findActiveMembershipsForUser.mockResolvedValue([activeMembership] as never);

      const profile = await service.login({ email: user.email, password: 'correct' }, res);

      expect(profile).toEqual({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'OWNER',
        email: 'owner@barney.test',
      });
      expect(repository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', tokenHash: 'hashed-refresh-token', tokenVersion: 0 }),
      );
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'signed-access-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'raw-refresh-token', expect.any(Object));
    });

    it('rejects an unknown email with a generic message (no user enumeration)', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@x.com', password: 'x' }, res)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login({ email: 'nobody@x.com', password: 'x' }, res)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('still performs an argon2 verification for an unknown email, to equalize timing with a wrong-password rejection', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@x.com', password: 'x' }, res)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(argon2.hash).toHaveBeenCalled();
      expect(argon2.verify).toHaveBeenCalled();
    });

    it('rejects an invalid password with the same generic message', async () => {
      repository.findUserByEmail.mockResolvedValue(user as never);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: user.email, password: 'wrong' }, res)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(repository.findActiveMembershipsForUser).not.toHaveBeenCalled();
    });

    it('rejects when the user has no active membership anywhere', async () => {
      repository.findUserByEmail.mockResolvedValue(user as never);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      repository.findActiveMembershipsForUser.mockResolvedValue([] as never);

      await expect(service.login({ email: user.email, password: 'correct' }, res)).rejects.toThrow(
        'No active tenant access',
      );
    });

    it('selects the first membership deterministically when multiple active memberships exist', async () => {
      const secondMembership = {
        ...activeMembership,
        id: 'membership-2',
        tenantId: 'tenant-2',
        role: { id: 'role-2', key: 'STAFF', name: 'Staff' },
      };
      repository.findUserByEmail.mockResolvedValue(user as never);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      repository.findActiveMembershipsForUser.mockResolvedValue([
        activeMembership,
        secondMembership,
      ] as never);

      const profile = await service.login({ email: user.email, password: 'correct' }, res);

      expect(profile.tenantId).toBe('tenant-1');
      expect(profile.role).toBe('OWNER');
    });
  });

  describe('refresh', () => {
    const storedToken = {
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      tokenVersion: 0,
      expiresAt: new Date(Date.now() + 100_000),
      revokedAt: null,
      replacedByTokenId: null,
    };

    it('rejects when no refresh token is presented', async () => {
      await expect(service.refresh(undefined, res)).rejects.toThrow('Missing refresh token');
    });

    it('rejects when the presented token does not match any stored hash', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.refresh('raw-refresh-token', res)).rejects.toThrow('Invalid refresh token');
    });

    it('rotates successfully for a valid, unused token', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(storedToken as never);
      repository.findUserById.mockResolvedValue(user as never);
      repository.findActiveMembershipsForUser.mockResolvedValue([activeMembership] as never);
      repository.createRefreshToken.mockResolvedValue({ id: 'token-2' } as never);

      const profile = await service.refresh('raw-refresh-token', res);

      expect(profile.userId).toBe('user-1');
      expect(repository.rotateRefreshToken).toHaveBeenCalledWith('token-1', 'token-2');
      expect(repository.revokeAllActiveRefreshTokensForUser).not.toHaveBeenCalled();
    });

    it('detects reuse of an already-rotated token and revokes the whole chain', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
        replacedByTokenId: 'token-2',
      } as never);

      await expect(service.refresh('raw-refresh-token', res)).rejects.toThrow(
        'Refresh token reuse detected',
      );
      expect(repository.revokeAllActiveRefreshTokensForUser).toHaveBeenCalledWith('user-1');
      // Must not proceed to issue new tokens after reuse is detected.
      expect(repository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a revoked-but-not-rotated token (e.g. from a mass revocation) without treating it as reuse', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
        replacedByTokenId: null,
      } as never);

      await expect(service.refresh('raw-refresh-token', res)).rejects.toThrow('Invalid refresh token');
      expect(repository.revokeAllActiveRefreshTokensForUser).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      await expect(service.refresh('raw-refresh-token', res)).rejects.toThrow('Invalid refresh token');
    });

    it('rejects when the stored token_version no longer matches the user (e.g. password changed)', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(storedToken as never);
      repository.findUserById.mockResolvedValue({ ...user, tokenVersion: 1 } as never);

      await expect(service.refresh('raw-refresh-token', res)).rejects.toThrow(
        'Refresh token invalidated',
      );
    });

    it('rejects when the user no longer has any active membership', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(storedToken as never);
      repository.findUserById.mockResolvedValue(user as never);
      repository.findActiveMembershipsForUser.mockResolvedValue([] as never);

      await expect(service.refresh('raw-refresh-token', res)).rejects.toThrow('No active tenant access');
    });
  });

  describe('logout', () => {
    it('revokes only the matching refresh token and clears both cookies', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue({ id: 'refresh-token-1' } as never);

      await service.logout('raw-refresh-token', res);

      expect(tokenService.hashToken).toHaveBeenCalledWith('raw-refresh-token');
      expect(repository.revokeRefreshTokenById).toHaveBeenCalledWith('refresh-token-1');
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });

    it('is idempotent when no refresh token cookie is present', async () => {
      await service.logout(undefined, res);

      expect(repository.findRefreshTokenByHash).not.toHaveBeenCalled();
      expect(repository.revokeRefreshTokenById).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });

    it('is idempotent when the refresh token does not match any stored session', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(null);

      await service.logout('unknown-token', res);

      expect(repository.revokeRefreshTokenById).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('forgotPassword', () => {
    it('creates a reset token for an existing user, invalidating any prior unused ones first', async () => {
      repository.findUserByEmail.mockResolvedValue(user as never);

      await service.forgotPassword({ email: user.email });

      expect(repository.invalidateUnusedPasswordResetTokensForUser).toHaveBeenCalledWith('user-1');
      expect(repository.createPasswordResetToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('does nothing (but does not error) for an unknown email', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: 'nobody@x.com' })).resolves.toBeUndefined();

      expect(repository.invalidateUnusedPasswordResetTokensForUser).not.toHaveBeenCalled();
      expect(repository.createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const storedResetToken = {
      id: 'reset-token-1',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      usedAt: null,
    };

    it('updates the password, bumps tokenVersion, and revokes all sessions', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue(storedResetToken as never);
      repository.markPasswordResetTokenUsedIfUnused.mockResolvedValue({ count: 1 } as never);
      (argon2.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.resetPassword({ token: 'raw-token', newPassword: 'BrandNewPassword1' });

      expect(repository.markPasswordResetTokenUsedIfUnused).toHaveBeenCalledWith('reset-token-1');
      expect(repository.updateUserPasswordAndBumpTokenVersion).toHaveBeenCalledWith(
        'user-1',
        'new-hashed-password',
      );
      expect(repository.revokeAllActiveRefreshTokensForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects an unknown token', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'raw-token', newPassword: 'BrandNewPassword1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an already-used token', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue({
        ...storedResetToken,
        usedAt: new Date(),
      } as never);
      await expect(
        service.resetPassword({ token: 'raw-token', newPassword: 'BrandNewPassword1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue({
        ...storedResetToken,
        expiresAt: new Date(Date.now() - 1000),
      } as never);
      await expect(
        service.resetPassword({ token: 'raw-token', newPassword: 'BrandNewPassword1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the guarded mark-used update loses a concurrent race', async () => {
      repository.findPasswordResetTokenByHash.mockResolvedValue(storedResetToken as never);
      repository.markPasswordResetTokenUsedIfUnused.mockResolvedValue({ count: 0 } as never);

      await expect(
        service.resetPassword({ token: 'raw-token', newPassword: 'BrandNewPassword1' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repository.updateUserPasswordAndBumpTokenVersion).not.toHaveBeenCalled();
    });
  });
});
