import { Prisma } from '@nursery-os/database';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Wraps a Prisma call so RLS can enforce tenant isolation as a backstop to
 * the explicit tenantId filtering every repository already does. app.tenant_id
 * is transaction-scoped (SET LOCAL semantics via set_config's is_local flag),
 * so it must be set inside the same transaction as the query it protects -
 * never set once and reused across calls.
 */
export async function withTenantContext<T>(
  prisma: PrismaService,
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
