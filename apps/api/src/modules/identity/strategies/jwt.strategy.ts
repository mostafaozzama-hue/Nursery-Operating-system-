import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/authenticated-request';

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: Buffer.from(process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY ?? '', 'base64').toString(
        'utf8',
      ),
      algorithms: ['RS256'],
    });
  }

  // Runs after signature+expiry verification; whatever is returned becomes request.user.
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
