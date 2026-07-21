import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
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
