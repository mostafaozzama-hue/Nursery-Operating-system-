import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthorizationService } from './authorization/authorization.service';
import { CurrentUserProvider } from './current-user.provider';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './identity.repository';
import { AuthService } from './identity.service';
import { JwtUserProvider } from './providers/jwt-user.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        privateKey: Buffer.from(process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY ?? '', 'base64').toString(
          'utf8',
        ),
        publicKey: Buffer.from(process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY ?? '', 'base64').toString(
          'utf8',
        ),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
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
  exports: [CurrentUserProvider, AuthorizationService, JwtAuthGuard, RolesGuard],
})
export class IdentityModule {}
