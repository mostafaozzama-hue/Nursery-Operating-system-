import { randomBytes, randomUUID, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims, { jwtid: randomUUID() });
  }

  accessTokenTtlMs(): number {
    return parseDurationMs(process.env.JWT_ACCESS_TOKEN_TTL ?? '15m');
  }

  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString('hex');
    return { token, hash: this.hashToken(token) };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshTokenTtlMs(): number {
    return parseDurationMs(process.env.JWT_REFRESH_TOKEN_TTL ?? '30d');
  }

  refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.refreshTokenTtlMs());
  }
}
