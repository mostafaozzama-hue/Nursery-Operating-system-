const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// System-defined roles (tenantId: null) - required for any tenant
// registration/membership flow to work at all. Nothing in the app creates
// these lazily (see identity.repository.ts's findSystemRoleId), so every
// environment needs this run once before the API is usable.
const SYSTEM_ROLES = [
  { key: 'OWNER', name: 'Owner' },
  { key: 'ADMIN', name: 'Admin' },
  { key: 'STAFF', name: 'Staff' },
];

async function seedSystemRoles() {
  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { key: role.key, tenantId: null, deletedAt: null },
    });
    if (existing) {
      console.log(`Role ${role.key} already seeded, skipping.`);
      continue;
    }
    await prisma.role.create({ data: { key: role.key, name: role.name, tenantId: null } });
    console.log(`Seeded role ${role.key}.`);
  }
}

async function main() {
  await seedSystemRoles();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
