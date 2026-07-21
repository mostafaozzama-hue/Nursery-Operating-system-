import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../config/environment-variables';
import { TokenService } from './token.service';

const envValues: Record<string, string> = {
  JWT_ACCESS_TOKEN_TTL: '15m',
  JWT_REFRESH_TOKEN_TTL: '30d',
};

describe('TokenService', () => {
  let jwtService: { signAsync: jest.Mock };
  let configService: jest.Mocked<ConfigService<EnvironmentVariables, true>>;
  let service: TokenService;

  beforeEach(() => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    configService = {
      get: jest.fn((key: string) => envValues[key]),
    } as unknown as jest.Mocked<ConfigService<EnvironmentVariables, true>>;
    service = new TokenService(jwtService as unknown as JwtService, configService);
  });

  describe('signAccessToken', () => {
    it('signs the given claims with a jwtid', async () => {
      const claims = {
        sub: 'user-1',
        membershipId: 'membership-1',
        tenantId: 'tenant-1',
        role: 'OWNER',
        tokenVersion: 0,
        email: 'a@b.com',
      };

      const token = await service.signAccessToken(claims);

      expect(token).toBe('signed.jwt.token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        claims,
        expect.objectContaining({ jwtid: expect.any(String) }),
      );
    });

    it('uses a different jwtid on every call', async () => {
      const claims = {
        sub: 'user-1',
        membershipId: 'membership-1',
        tenantId: 'tenant-1',
        role: 'OWNER',
        tokenVersion: 0,
        email: 'a@b.com',
      };

      await service.signAccessToken(claims);
      await service.signAccessToken(claims);

      const [firstCallOptions] = jwtService.signAsync.mock.calls[0].slice(1);
      const [secondCallOptions] = jwtService.signAsync.mock.calls[1].slice(1);
      expect(firstCallOptions.jwtid).not.toBe(secondCallOptions.jwtid);
    });
  });

  describe('generateRefreshToken', () => {
    it('produces a token and a distinct, deterministic hash', () => {
      const { token, hash } = service.generateRefreshToken();

      expect(token).toMatch(/^[0-9a-f]{96}$/);
      expect(hash).not.toBe(token);
      expect(service.hashToken(token)).toBe(hash);
    });

    it('produces different tokens on each call', () => {
      const first = service.generateRefreshToken();
      const second = service.generateRefreshToken();
      expect(first.token).not.toBe(second.token);
    });
  });

  describe('hashToken', () => {
    it('is deterministic for the same input', () => {
      expect(service.hashToken('abc')).toBe(service.hashToken('abc'));
    });

    it('differs for different input', () => {
      expect(service.hashToken('abc')).not.toBe(service.hashToken('abd'));
    });
  });

  describe('TTL helpers', () => {
    it('accessTokenTtlMs reflects JWT_ACCESS_TOKEN_TTL', () => {
      expect(service.accessTokenTtlMs()).toBe(15 * 60_000);
    });

    it('refreshTokenTtlMs reflects JWT_REFRESH_TOKEN_TTL', () => {
      expect(service.refreshTokenTtlMs()).toBe(30 * 86_400_000);
    });

    it('refreshTokenExpiresAt is now + the TTL, within a small tolerance', () => {
      const before = Date.now();
      const expiresAt = service.refreshTokenExpiresAt();
      const after = Date.now();

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + service.refreshTokenTtlMs());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + service.refreshTokenTtlMs());
    });
  });
});
