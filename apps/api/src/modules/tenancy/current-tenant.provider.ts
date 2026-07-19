/**
 * The only thing the rest of the app knows about tenant resolution. No
 * consumer ever reads a JWT, a header, or Prisma directly - only this.
 * Swapping the bound implementation (see TenancyModule) is the sole change
 * required when JWT-based tenant resolution replaces the fixed dev tenant.
 */
export abstract class CurrentTenantProvider {
  abstract getTenantId(): string;
}
