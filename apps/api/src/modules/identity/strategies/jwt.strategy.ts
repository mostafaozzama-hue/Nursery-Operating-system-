import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvironmentVariables } from '../../../config/environment-variables';
import { JwtPayload } from '../types/authenticated-request';

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: Buffer.from(
        configService.get('JWT_ACCESS_TOKEN_PUBLIC_KEY', { infer: true }),
        'base64',
      ).toString('utf8'),
      algorithms: ['RS256'],
    });
  }

  // Runs after signature+expiry verification; whatever is returned becomes request.user.
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
