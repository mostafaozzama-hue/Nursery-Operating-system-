import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CurrentUserProvider } from '../current-user.provider';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable({ scope: Scope.REQUEST })
export class JwtUserProvider extends CurrentUserProvider {
  constructor(@Inject(REQUEST) private readonly request: AuthenticatedRequest) {
    super();
  }

  getUserId(): string {
    if (!this.request.user) {
      throw new UnauthorizedException('No authenticated request context');
    }
    return this.request.user.sub;
  }
}
