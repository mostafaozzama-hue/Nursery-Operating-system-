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

describe('Invite flow (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let adminAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipAdminAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `invite-owner-a-${Date.now()}@e2e.test`;
  const adminAEmail = `invite-admin-a-${Date.now()}@e2e.test`;
  const staffAEmail = `invite-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `invite-owner-b-${Date.now()}@e2e.test`;

  const createdUserIds: string[] = [];
  const createdMembershipIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Invite Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const adminA = await createTestUser(adminAEmail, password);
    adminAId = adminA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipAdminAId = (await createTestMembership(adminAId, tenantAId, 'ADMIN')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Invite Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId, adminAId, staffAId, ownerBId, ...createdUserIds],
      membershipIds: [membershipOwnerAId, membershipAdminAId, membershipStaffAId, membershipOwnerBId, ...createdMembershipIds],
      userIds: [ownerAId, adminAId, staffAId, ownerBId, ...createdUserIds],
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

  it('rejects an unauthenticated invite', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/invite')
      .send({ email: 'x@e2e.test', roleKey: 'STAFF' });
    expect(res.status).toBe(401);
  });

  it('forbids STAFF from inviting anyone', async () => {
    const staffAgent = await loginAs(staffAEmail);
    const res = await staffAgent
      .post('/auth/invite')
      .send({ email: `staff-invitee-${Date.now()}@e2e.test`, roleKey: 'STAFF' });
    expect(res.status).toBe(403);
  });

  it('forbids ADMIN from inviting an OWNER, but allows OWNER to do so', async () => {
    const adminAgent = await loginAs(adminAEmail);
    const forbiddenRes = await adminAgent
      .post('/auth/invite')
      .send({ email: `admin-tries-owner-${Date.now()}@e2e.test`, roleKey: 'OWNER' });
    expect(forbiddenRes.status).toBe(403);

    const ownerAgent = await loginAs(ownerAEmail);
    const allowedRes = await ownerAgent
      .post('/auth/invite')
      .send({ email: `owner-invites-owner-${Date.now()}@e2e.test`, roleKey: 'OWNER' });
    expect(allowedRes.status).toBe(201);
    expect(allowedRes.body.roleKey).toBe('OWNER');
    createdUserIds.push(allowedRes.body.userId);
    createdMembershipIds.push(allowedRes.body.id);
  });

  it('rejects inviting an email that is already an active member of this tenant', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const res = await ownerAgent.post('/auth/invite').send({ email: staffAEmail, roleKey: 'STAFF' });
    expect(res.status).toBe(409);
  });

  it('runs the full lifecycle: invite -> accept -> new user can log in', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const email = `full-lifecycle-${Date.now()}@e2e.test`;

    const inviteRes = await ownerAgent.post('/auth/invite').send({ email, roleKey: 'STAFF' });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.status).toBe('INVITED');
    createdUserIds.push(inviteRes.body.userId);
    createdMembershipIds.push(inviteRes.body.id);

    const acceptRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantAId,
      token: inviteRes.body.inviteToken,
      password: 'NewPersonPassword1',
    });
    expect(acceptRes.status).toBe(204);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'NewPersonPassword1' });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.role).toBe('STAFF');
    expect(loginRes.body.tenantId).toBe(tenantAId);
  });

  it('resending an invite issues a new token that invalidates the old one', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const email = `resend-${Date.now()}@e2e.test`;

    const firstInviteRes = await ownerAgent.post('/auth/invite').send({ email, roleKey: 'STAFF' });
    expect(firstInviteRes.status).toBe(201);
    createdUserIds.push(firstInviteRes.body.userId);
    createdMembershipIds.push(firstInviteRes.body.id);

    const secondInviteRes = await ownerAgent.post('/auth/invite').send({ email, roleKey: 'ADMIN' });
    expect(secondInviteRes.status).toBe(201);
    expect(secondInviteRes.body.roleKey).toBe('ADMIN');
    expect(secondInviteRes.body.inviteToken).not.toBe(firstInviteRes.body.inviteToken);

    const acceptWithOldTokenRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantAId,
      token: firstInviteRes.body.inviteToken,
      password: 'SomePassword1234',
    });
    expect(acceptWithOldTokenRes.status).toBe(409);

    const acceptWithNewTokenRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantAId,
      token: secondInviteRes.body.inviteToken,
      password: 'SomePassword1234',
    });
    expect(acceptWithNewTokenRes.status).toBe(204);
  });

  it('rejects accept-invite with the wrong tenantId, an expired token, or a reused token', async () => {
    const ownerAgent = await loginAs(ownerAEmail);

    const wrongTenantEmail = `wrong-tenant-${Date.now()}@e2e.test`;
    const wrongTenantInviteRes = await ownerAgent
      .post('/auth/invite')
      .send({ email: wrongTenantEmail, roleKey: 'STAFF' });
    createdUserIds.push(wrongTenantInviteRes.body.userId);
    createdMembershipIds.push(wrongTenantInviteRes.body.id);

    const wrongTenantRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantBId,
      token: wrongTenantInviteRes.body.inviteToken,
      password: 'SomePassword1234',
    });
    expect(wrongTenantRes.status).toBe(409);

    const expiredEmail = `expired-${Date.now()}@e2e.test`;
    const expiredInviteRes = await ownerAgent.post('/auth/invite').send({ email: expiredEmail, roleKey: 'STAFF' });
    createdUserIds.push(expiredInviteRes.body.userId);
    createdMembershipIds.push(expiredInviteRes.body.id);
    await superuserPrisma.tenantMembership.update({
      where: { id: expiredInviteRes.body.id },
      data: { inviteExpiresAt: new Date(Date.now() - 1000) },
    });
    const expiredRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantAId,
      token: expiredInviteRes.body.inviteToken,
      password: 'SomePassword1234',
    });
    expect(expiredRes.status).toBe(409);

    const reuseEmail = `reuse-${Date.now()}@e2e.test`;
    const reuseInviteRes = await ownerAgent.post('/auth/invite').send({ email: reuseEmail, roleKey: 'STAFF' });
    createdUserIds.push(reuseInviteRes.body.userId);
    createdMembershipIds.push(reuseInviteRes.body.id);
    const firstAcceptRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantAId,
      token: reuseInviteRes.body.inviteToken,
      password: 'SomePassword1234',
    });
    expect(firstAcceptRes.status).toBe(204);
    const secondAcceptRes = await request(app.getHttpServer()).post('/auth/accept-invite').send({
      tenantId: tenantAId,
      token: reuseInviteRes.body.inviteToken,
      password: 'DifferentPassword1234',
    });
    expect(secondAcceptRes.status).toBe(409);
  });

  it('serializes two concurrent accept-invite attempts so exactly one succeeds', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const email = `concurrent-accept-${Date.now()}@e2e.test`;
    const inviteRes = await ownerAgent.post('/auth/invite').send({ email, roleKey: 'STAFF' });
    createdUserIds.push(inviteRes.body.userId);
    createdMembershipIds.push(inviteRes.body.id);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ tenantId: tenantAId, token: inviteRes.body.inviteToken, password: 'PasswordOne1234' }),
      request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ tenantId: tenantAId, token: inviteRes.body.inviteToken, password: 'PasswordTwo1234' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([204, 409]);

    const storedMembership = await superuserPrisma.tenantMembership.findUnique({
      where: { id: inviteRes.body.id },
    });
    expect(storedMembership?.status).toBe('ACTIVE');
  });
});
