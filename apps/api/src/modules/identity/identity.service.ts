import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { isUniqueConstraintViolation } from '../../common/errors/is-unique-constraint-violation';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { IdentityRepository } from './identity.repository';
import { AccessTokenClaims, TokenService } from './token.service';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private dummyPasswordHash: Promise<string> | undefined;

  constructor(
    private readonly repository: IdentityRepository,
    private readonly tokenService: TokenService,
  ) {}

  /** Computed once per process and cached - a fixed, never-matchable hash used purely to equalize login's timing cost. */
  private getDummyPasswordHash(): Promise<string> {
    if (!this.dummyPasswordHash) {
      this.dummyPasswordHash = argon2.hash(randomBytes(32).toString('hex'));
    }
    return this.dummyPasswordHash;
  }

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
      // Still pay the argon2 cost even though there's nothing real to check
      // against - otherwise a nonexistent email returns measurably faster
      // than a wrong password, letting an attacker enumerate registered
      // emails by timing alone.
      await argon2.verify(await this.getDummyPasswordHash(), dto.password);
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

  /**
   * Revokes only the current session's refresh token (not "log out
   * everywhere") and clears cookies. Deliberately takes no JwtAuthGuard at
   * the controller level - must work even with an already-expired access
   * token, matching how refresh() also works directly off the cookie. Note
   * this does not invalidate an already-issued access token before its own
   * short TTL elapses; JwtStrategy verifies signature+expiry only, with no
   * live DB check per request.
   */
  async logout(refreshTokenValue: string | undefined, res: Response): Promise<void> {
    if (refreshTokenValue) {
      const hash = this.tokenService.hashToken(refreshTokenValue);
      const existing = await this.repository.findRefreshTokenByHash(hash);
      if (existing) {
        await this.repository.revokeRefreshTokenById(existing.id);
      }
    }

    this.clearAuthCookies(res);
  }

  /**
   * Always the same response regardless of whether the email exists or
   * has an active account - revealing the difference would let an
   * attacker enumerate registered emails, the same class of issue fixed
   * in login(). The raw token is never returned or logged anywhere -
   * unlike an invite token, the caller here isn't a trusted, authenticated
   * actor. Without email infrastructure, delivering it is out of scope;
   * e2e tests read the stored hash directly via the test DB connection.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) {
      return;
    }

    // Only the latest requested token should ever be valid.
    await this.repository.invalidateUnusedPasswordResetTokensForUser(user.id);

    const rawToken = randomBytes(32).toString('hex');
    await this.repository.createPasswordResetToken({
      userId: user.id,
      tokenHash: this.tokenService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });
  }

  /**
   * Bumps tokenVersion on success - the same mechanism refresh() already
   * checks - so every existing session is forced to re-authenticate, in
   * case the old password was compromised and a session already exists.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.tokenService.hashToken(dto.token);
    const existing = await this.repository.findPasswordResetTokenByHash(tokenHash);

    if (!existing || existing.usedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Guarded: only succeeds if still unused - closes the concurrent-
    // double-reset race the same way accept-invite's guarded update does.
    const { count } = await this.repository.markPasswordResetTokenUsedIfUnused(existing.id);
    if (count === 0) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    await this.repository.updateUserPasswordAndBumpTokenVersion(existing.userId, newPasswordHash);
    await this.repository.revokeAllActiveRefreshTokensForUser(existing.userId);
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

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
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
