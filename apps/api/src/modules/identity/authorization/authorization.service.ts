import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../types/authenticated-request';
import { AuthorizationRequirement } from './authorization-requirement';

/**
 * The single seam authorization decisions go through. RolesGuard delegates
 * here rather than comparing roles itself, so a future permission-based
 * model can replace the role check below without changing RolesGuard or any
 * controller/@Roles() call site.
 */
@Injectable()
export class AuthorizationService {
  isAuthorized(user: JwtPayload, requirement: AuthorizationRequirement): boolean {
    return requirement.anyOfRoles.includes(user.role);
  }
}
