import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { EnvironmentVariables } from '../../config/environment-variables';
import { AuthorizationService } from './authorization/authorization.service';
import { CurrentUserProvider } from './current-user.provider';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './identity.repository';
import { AuthService } from './identity.service';
import { MembershipModule } from './membership/membership.module';
import { JwtUserProvider } from './providers/jwt-user.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    MembershipModule,
    // Security review Pass 2 (S2): register/login/forgot-password had no
    // brute-force/enumeration throttle at all. Named 'auth' so it's opted
    // into per-route via @Throttle({ auth: {...} }), not applied globally -
    // every other endpoint is unaffected. skipIf disables it only under
    // Jest (JEST_WORKER_ID is set by Jest itself, never in a real
    // deployment) - e2e specs call /auth/login far more than any real
    // brute-force limit would allow (e.g. auth.e2e-spec.ts alone logs in
    // 14 times), and throttling test infrastructure isn't this guard's job.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'auth', ttl: 60_000, limit: 10 }],
      skipIf: () => process.env.JEST_WORKER_ID !== undefined,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        privateKey: Buffer.from(
          configService.get('JWT_ACCESS_TOKEN_PRIVATE_KEY', { infer: true }),
          'base64',
        ).toString('utf8'),
        publicKey: Buffer.from(
          configService.get('JWT_ACCESS_TOKEN_PUBLIC_KEY', { infer: true }),
          'base64',
        ).toString('utf8'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: configService.get('JWT_ACCESS_TOKEN_TTL', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [
    IdentityRepository,
    AuthService,
    TokenService,
    JwtStrategy,
    AuthorizationService,
    JwtAuthGuard,
    RolesGuard,
    { provide: CurrentUserProvider, useClass: JwtUserProvider },
  ],
  exports: [CurrentUserProvider, AuthorizationService, JwtAuthGuard, RolesGuard, TokenService],
})
export class IdentityModule {}
