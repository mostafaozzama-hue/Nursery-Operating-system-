import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Response } from 'express';
import { isUniqueConstraintViolation } from '../../common/errors/is-unique-constraint-violation';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IdentityRepository } from './identity.repository';
import { AccessTokenClaims, TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto, res: Response): Promise<CurrentUserResponseDto> {
    const ownerRole = await this.repository.findSystemRoleId('OWNER');
    if (!ownerRole) {
      throw new Error('OWNER system role is not seeded');
    }

    const passwordHash = await argon2.hash(dto.password);

    let result: Awaited<ReturnType<IdentityRepository['registerTenantOwner']>>;
    try {
      result = await this.repository.registerTenantOwner({
        tenantName: dto.tenantName,
        email: dto.email,
        passwordHash,
        roleId: ownerRole.id,
        timezone: dto.timezone,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }

    const claims: AccessTokenClaims = {
      sub: result.user.id,
      membershipId: result.membership.id,
      tenantId: result.tenant.id,
      role: 'OWNER',
      tokenVersion: result.user.tokenVersion,
      email: result.user.email,
    };

    return this.issueSession(claims, res);
  }

  async login(dto: LoginDto, res: Response): Promise<CurrentUserResponseDto> {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.repository.findActiveMembershipsForUser(user.id);
    const membership = memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No active tenant access');
    }

    const claims: AccessTokenClaims = {
      sub: user.id,
      membershipId: membership.id,
      tenantId: membership.tenantId,
      role: membership.role.key,
      tokenVersion: user.tokenVersion,
      email: user.email,
    };

    return this.issueSession(claims, res);
  }

  async refresh(refreshTokenValue: string | undefined, res: Response): Promise<CurrentUserResponseDto> {
    if (!refreshTokenValue) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const hash = this.tokenService.hashToken(refreshTokenValue);
    const existing = await this.repository.findRefreshTokenByHash(hash);

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse of an already-rotated token is a specific signal (replacedByTokenId),
    // distinct from "revoked for some other reason" - must be checked before the
    // generic revoked/expired check below, since rotation itself sets revokedAt
    // on the old token, which would otherwise mask the reuse case entirely.
    if (existing.replacedByTokenId) {
      await this.repository.revokeAllActiveRefreshTokensForUser(existing.userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.repository.findUserById(existing.userId);
    if (!user || user.tokenVersion !== existing.tokenVersion) {
      throw new UnauthorizedException('Refresh token invalidated');
    }

    const memberships = await this.repository.findActiveMembershipsForUser(user.id);
    const membership = memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No active tenant access');
    }

    const claims: AccessTokenClaims = {
      sub: user.id,
      membershipId: membership.id,
      tenantId: membership.tenantId,
      role: membership.role.key,
      tokenVersion: user.tokenVersion,
      email: user.email,
    };

    const accessToken = await this.tokenService.signAccessToken(claims);
    const { token: newRefreshToken, hash: newHash } = this.tokenService.generateRefreshToken();

    const created = await this.repository.createRefreshToken({
      userId: user.id,
      tokenHash: newHash,
      tokenVersion: user.tokenVersion,
      expiresAt: this.tokenService.refreshTokenExpiresAt(),
    });

    await this.repository.rotateRefreshToken(existing.id, created.id);

    this.setAuthCookies(res, accessToken, newRefreshToken);
    return this.toProfile(claims);
  }

  /** Shared by register/login: sign + store + cookie the tokens, return the profile. */
  private async issueSession(claims: AccessTokenClaims, res: Response): Promise<CurrentUserResponseDto> {
    const accessToken = await this.tokenService.signAccessToken(claims);
    const { token: refreshToken, hash } = this.tokenService.generateRefreshToken();

    await this.repository.createRefreshToken({
      userId: claims.sub,
      tokenHash: hash,
      tokenVersion: claims.tokenVersion,
      expiresAt: this.tokenService.refreshTokenExpiresAt(),
    });

    this.setAuthCookies(res, accessToken, refreshToken);
    return this.toProfile(claims);
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const secure = process.env.COOKIE_SECURE === 'true';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: this.tokenService.accessTokenTtlMs(),
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: this.tokenService.refreshTokenTtlMs(),
    });
  }

  private toProfile(claims: AccessTokenClaims): CurrentUserResponseDto {
    return {
      userId: claims.sub,
      tenantId: claims.tenantId,
      role: claims.role,
      email: claims.email,
    };
  }
}
