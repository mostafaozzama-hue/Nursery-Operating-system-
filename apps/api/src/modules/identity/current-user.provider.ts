/**
 * Mirrors CurrentTenantProvider (modules/tenancy) - the only thing the rest
 * of the app knows about "who is making this request". No consumer ever
 * reads a JWT or the raw request directly, only this.
 */
export abstract class CurrentUserProvider {
  abstract getUserId(): string;
}
