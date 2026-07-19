/**
 * The shape of an authorization decision request. Today only role-based
 * (anyOfRoles). When fine-grained permissions exist (Phase 2), this gains a
 * permission-based variant and AuthorizationService.isAuthorized changes
 * internally - RolesGuard and every call site stay the same.
 */
export interface AuthorizationRequirement {
  anyOfRoles: string[];
}
