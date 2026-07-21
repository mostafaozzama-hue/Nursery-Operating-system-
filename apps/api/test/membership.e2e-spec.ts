import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  cleanupTestData,
  createTestMembership,
  createTestTenant,
  createTestUser,
  superuserPrisma,
} from './utils/test-db';

describe('Membership administration (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let ownerA2Id: string;
  let adminAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipOwnerA2Id: string;
  let membershipAdminAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `mem-owner-a-${Date.now()}@e2e.test`;
  const ownerA2Email = `mem-owner-a2-${Date.now()}@e2e.test`;
  const adminAEmail = `mem-admin-a-${Date.now()}@e2e.test`;
  const staffAEmail = `mem-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `mem-owner-b-${Date.now()}@e2e.test`;

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Membership Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const ownerA2 = await createTestUser(ownerA2Email, password);
    ownerA2Id = ownerA2.id;
    const adminA = await createTestUser(adminAEmail, password);
    adminAId = adminA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipOwnerA2Id = (await createTestMembership(ownerA2Id, tenantAId, 'OWNER')).id;
    membershipAdminAId = (await createTestMembership(adminAId, tenantAId, 'ADMIN')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Membership Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId, ownerA2Id, adminAId, staffAId, ownerBId],
      membershipIds: [membershipOwnerAId, membershipOwnerA2Id, membershipAdminAId, membershipStaffAId, membershipOwnerBId],
      userIds: [ownerAId, ownerA2Id, adminAId, staffAId, ownerBId],
      tenantIds: [tenantAId, tenantBId],
    });
    await app.close();
  });

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    return agent;
  }

  it('rejects an unauthenticated request to either route', async () => {
    const listRes = await request(app.getHttpServer()).get('/memberships');
    expect(listRes.status).toBe(401);

    const patchRes = await request(app.getHttpServer())
      .patch(`/memberships/${membershipStaffAId}`)
      .send({ status: 'SUSPENDED' });
    expect(patchRes.status).toBe(401);
  });

  it('forbids STAFF from listing or modifying memberships', async () => {
    const staffAgent = await loginAs(staffAEmail);

    const listRes = await staffAgent.get('/memberships');
    expect(listRes.status).toBe(403);

    const patchRes = await staffAgent
      .patch(`/memberships/${membershipAdminAId}`)
      .send({ status: 'SUSPENDED' });
    expect(patchRes.status).toBe(403);
  });

  it('allows ADMIN and OWNER to list memberships, filterable by status and roleKey', async () => {
    const adminAgent = await loginAs(adminAEmail);
    const listRes = await adminAgent.get('/memberships?pageSize=100');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(4);

    const byRoleRes = await adminAgent.get('/memberships?roleKey=STAFF');
    expect(byRoleRes.body.data.every((m: { roleKey: string }) => m.roleKey === 'STAFF')).toBe(true);

    const byStatusRes = await adminAgent.get('/memberships?status=ACTIVE&pageSize=100');
    expect(byStatusRes.body.data.every((m: { status: string }) => m.status === 'ACTIVE')).toBe(true);
  });

  it('404s for an unknown membership id', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const res = await ownerAgent
      .patch('/memberships/00000000-0000-0000-0000-000000000000')
      .send({ status: 'SUSPENDED' });
    expect(res.status).toBe(404);
  });

  it('forbids self-modification, for both OWNER and ADMIN callers', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const ownerSelfRes = await ownerAgent
      .patch(`/memberships/${membershipOwnerAId}`)
      .send({ status: 'SUSPENDED' });
    expect(ownerSelfRes.status).toBe(403);

    const adminAgent = await loginAs(adminAEmail);
    const adminSelfRes = await adminAgent
      .patch(`/memberships/${membershipAdminAId}`)
      .send({ roleKey: 'STAFF' });
    expect(adminSelfRes.status).toBe(403);
  });

  it('forbids ADMIN from modifying an OWNER membership or granting OWNER, but allows an OWNER to do both', async () => {
    const adminAgent = await loginAs(adminAEmail);
    const adminTouchesOwnerRes = await adminAgent
      .patch(`/memberships/${membershipOwnerA2Id}`)
      .send({ status: 'SUSPENDED' });
    expect(adminTouchesOwnerRes.status).toBe(403);

    const adminGrantsOwnerRes = await adminAgent
      .patch(`/memberships/${membershipStaffAId}`)
      .send({ roleKey: 'OWNER' });
    expect(adminGrantsOwnerRes.status).toBe(403);

    const ownerAgent = await loginAs(ownerAEmail);
    const ownerTouchesOwnerRes = await ownerAgent
      .patch(`/memberships/${membershipOwnerA2Id}`)
      .send({ roleKey: 'ADMIN' });
    expect(ownerTouchesOwnerRes.status).toBe(200);
    expect(ownerTouchesOwnerRes.body.roleKey).toBe('ADMIN');

    // Restore for later tests / clarity.
    await ownerAgent.patch(`/memberships/${membershipOwnerA2Id}`).send({ roleKey: 'OWNER' });
  });

  it('suspends and reactivates a membership, updating activatedAt on reactivation', async () => {
    const ownerAgent = await loginAs(ownerAEmail);

    const beforeSuspend = await superuserPrisma.tenantMembership.findUnique({
      where: { id: membershipStaffAId },
    });

    const suspendRes = await ownerAgent
      .patch(`/memberships/${membershipStaffAId}`)
      .send({ status: 'SUSPENDED' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.status).toBe('SUSPENDED');

    const reactivateRes = await ownerAgent
      .patch(`/memberships/${membershipStaffAId}`)
      .send({ status: 'ACTIVE' });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.status).toBe('ACTIVE');

    const afterReactivate = await superuserPrisma.tenantMembership.findUnique({
      where: { id: membershipStaffAId },
    });
    expect(afterReactivate?.activatedAt?.getTime()).toBeGreaterThan(
      beforeSuspend?.activatedAt?.getTime() ?? 0,
    );
  });

  it('revokes a membership, setting revokedAt, and the revoked user can no longer log in', async () => {
    const ownerAgent = await loginAs(ownerAEmail);

    const revokeRes = await ownerAgent
      .patch(`/memberships/${membershipStaffAId}`)
      .send({ status: 'REVOKED' });
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.status).toBe('REVOKED');

    const stored = await superuserPrisma.tenantMembership.findUnique({ where: { id: membershipStaffAId } });
    expect(stored?.revokedAt).not.toBeNull();

    const loginAsRevokedRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: staffAEmail, password });
    expect(loginAsRevokedRes.status).toBe(401);
  });

  it("tenant B cannot see or modify tenant A's memberships (RLS isolation)", async () => {
    const agentB = await loginAs(ownerBEmail);

    const listAsB = await agentB.get('/memberships?pageSize=100');
    expect(listAsB.body.data.map((m: { id: string }) => m.id)).not.toContain(membershipAdminAId);

    const patchAsB = await agentB.patch(`/memberships/${membershipAdminAId}`).send({ status: 'SUSPENDED' });
    expect(patchAsB.status).toBe(404);
  });
});
