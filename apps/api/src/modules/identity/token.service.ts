import { randomBytes, randomUUID, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../config/environment-variables';
import { parseDurationMs } from './parse-duration';

export interface AccessTokenClaims {
  sub: string;
  membershipId: string;
  tenantId: string;
  role: string;
  tokenVersion: number;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims, { jwtid: randomUUID() });
  }

  accessTokenTtlMs(): number {
    return parseDurationMs(this.configService.get('JWT_ACCESS_TOKEN_TTL', { infer: true }));
  }

  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString('hex');
    return { token, hash: this.hashToken(token) };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshTokenTtlMs(): number {
    return parseDurationMs(this.configService.get('JWT_REFRESH_TOKEN_TTL', { infer: true }));
  }

  refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshTokenTtlMs());
  }
}
