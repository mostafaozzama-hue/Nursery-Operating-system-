import { PrismaClient } from '@nursery-os/database';
import * as argon2 from 'argon2';

/**
 * Connects as the nursery superuser (bypasses RLS) purely for test
 * setup/teardown across arbitrary tenants - the application itself never
 * uses this connection, only these test helpers.
 */
export const superuserPrisma = new PrismaClient({
  datasourceUrl: 'postgresql://nursery:nursery@localhost:5432/nursery_os',
});

export type SystemRoleKey = 'OWNER' | 'ADMIN' | 'STAFF';

export async function getSystemRoleId(key: SystemRoleKey): Promise<string> {
  const role = await superuserPrisma.role.findFirst({
    where: { key, tenantId: null, deletedAt: null },
  });
  if (!role) {
    throw new Error(`System role "${key}" is not seeded - run the role seed before testing`);
  }
  return role.id;
}

export async function createTestTenant(name: string) {
  return superuserPrisma.tenant.create({ data: { name } });
}

export async function createTestUser(email: string, password: string) {
  const passwordHash = await argon2.hash(password);
  return superuserPrisma.user.create({ data: { email, passwordHash } });
}

export async function createTestMembership(
  userId: string,
  tenantId: string,
  roleKey: SystemRoleKey,
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REVOKED' = 'ACTIVE',
) {
  const roleId = await getSystemRoleId(roleKey);
  return superuserPrisma.tenantMembership.create({
    data: { userId, tenantId, roleId, status, activatedAt: status === 'ACTIVE' ? new Date() : null },
  });
}

/** FK-safe teardown: refresh tokens -> memberships -> users -> tenants -> classrooms. */
export async function cleanupTestData(ids: {
  refreshTokenUserIds?: string[];
  membershipIds?: string[];
  classroomIds?: string[];
  userIds?: string[];
  tenantIds?: string[];
}): Promise<void> {
  if (ids.refreshTokenUserIds?.length) {
    await superuserPrisma.refreshToken.deleteMany({
      where: { userId: { in: ids.refreshTokenUserIds } },
    });
  }
  if (ids.classroomIds?.length) {
    await superuserPrisma.classroom.deleteMany({ where: { id: { in: ids.classroomIds } } });
  }
  if (ids.membershipIds?.length) {
    await superuserPrisma.tenantMembership.deleteMany({ where: { id: { in: ids.membershipIds } } });
  }
  if (ids.userIds?.length) {
    await superuserPrisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  }
  if (ids.tenantIds?.length) {
    await superuserPrisma.tenant.deleteMany({ where: { id: { in: ids.tenantIds } } });
  }
}
