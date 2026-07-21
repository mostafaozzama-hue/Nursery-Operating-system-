import { Prisma } from '@nursery-os/database';
import { InactiveMembershipError } from '../errors/inactive-membership.error';
import { findOrThrow } from './find-or-throw';

/**
 * Shared by Guardian and Staff: userId must belong to a real user (404 via
 * findOrThrow if not) with an active TenantMembership in this same tenant
 * (InactiveMembershipError -> 400 otherwise) - the application-layer-only
 * invariant documented for both entities in domain-model.md.
 *
 * Deliberately does not check "already linked to another Guardian/Staff
 * row" - that part is entity-specific (different tables, different
 * conflict messages) and stays local to each repository, including its own
 * excludeId handling for the self-update-false-positive case.
 */
export async function assertActiveMembership(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  await findOrThrow('User', userId, () => tx.user.findFirst({ where: { id: userId, deletedAt: null } }));

  const activeMembership = await tx.tenantMembership.findFirst({
    where: { userId, tenantId, status: 'ACTIVE', deletedAt: null },
  });
  if (!activeMembership) {
    throw new InactiveMembershipError(`User ${userId} does not have an active membership in this tenant`);
  }
}
