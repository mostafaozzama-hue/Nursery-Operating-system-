import { EntityNotFoundError } from '../errors/entity-not-found.error';
import { InactiveMembershipError } from '../errors/inactive-membership.error';
import { assertActiveMembership } from './assert-active-membership';

describe('assertActiveMembership', () => {
  function buildTx(options: { user: unknown; membership: unknown }) {
    return {
      user: { findFirst: jest.fn().mockResolvedValue(options.user) },
      tenantMembership: { findFirst: jest.fn().mockResolvedValue(options.membership) },
    } as never;
  }

  it('resolves when the user exists and has an active membership in the tenant', async () => {
    const tx = buildTx({ user: { id: 'user-1' }, membership: { id: 'membership-1' } });
    await expect(assertActiveMembership(tx, 'tenant-1', 'user-1')).resolves.toBeUndefined();
  });

  it('throws EntityNotFoundError when the user does not exist', async () => {
    const tx = buildTx({ user: null, membership: null });
    await expect(assertActiveMembership(tx, 'tenant-1', 'user-1')).rejects.toThrow(EntityNotFoundError);
  });

  it('throws InactiveMembershipError when the user has no active membership in the tenant', async () => {
    const tx = buildTx({ user: { id: 'user-1' }, membership: null });
    await expect(assertActiveMembership(tx, 'tenant-1', 'user-1')).rejects.toThrow(InactiveMembershipError);
  });
});
