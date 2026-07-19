import { Prisma } from '@nursery-os/database';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Analogous to withTenantContext (modules/tenancy), but sets app.user_id
 * instead of app.tenant_id - needed only for the self_access RLS policy on
 * tenant_memberships, which exists for the one case where a tenant isn't
 * known yet: resolving a user's memberships immediately after password
 * verification at login.
 */
export async function withUserContext<T>(
  prisma: PrismaService,
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
