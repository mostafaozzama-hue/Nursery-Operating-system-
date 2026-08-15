import { Prisma, PrismaClient } from '@nursery-os/database';
import * as argon2 from 'argon2';

/**
 * Connects as the nursery superuser (bypasses RLS) purely for test
 * setup/teardown across arbitrary tenants - the application itself never
 * uses this connection, only these test helpers.
 */
export const superuserPrisma = new PrismaClient({
  datasourceUrl: 'postgresql://nursery:nursery@localhost:5432/nursery_os',
});

/**
 * Connects as nursery_app - the same least-privilege, RLS-subject role the
 * application itself uses. For schema-level tests that need to exercise RLS
 * directly without bootstrapping the full NestJS app.
 */
export const appRolePrisma = new PrismaClient({
  datasourceUrl: 'postgresql://nursery_app:nursery_app@localhost:5432/nursery_os',
});

/**
 * Standalone equivalent of the API's withTenantContext (see
 * apps/api/src/modules/tenancy/with-tenant-context.ts) - app.tenant_id is
 * transaction-scoped (SET LOCAL semantics), so it must be set inside the
 * same transaction as the query it protects.
 */
export async function withTenantScope<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return appRolePrisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

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

export async function createTestTenant(name: string, timezone?: string) {
  return superuserPrisma.tenant.create({ data: { name, timezone } });
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
  /** For rows whose membership id isn't known up front (e.g. created via register). */
  membershipUserIds?: string[];
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
  if (ids.membershipUserIds?.length) {
    await superuserPrisma.tenantMembership.deleteMany({
      where: { userId: { in: ids.membershipUserIds } },
    });
  }
  if (ids.userIds?.length) {
    await superuserPrisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  }
  if (ids.tenantIds?.length) {
    await superuserPrisma.tenant.deleteMany({ where: { id: { in: ids.tenantIds } } });
  }
}
