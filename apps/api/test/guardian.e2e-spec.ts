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

describe('Guardian module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `guardian-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `guardian-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `guardian-owner-b-${Date.now()}@e2e.test`;

  // A user with no membership at all in tenant A, and one whose membership is INVITED (not ACTIVE).
  let unaffiliatedUserId: string;
  let invitedUserId: string;
  let invitedMembershipId: string;
  const unaffiliatedEmail = `guardian-unaffiliated-${Date.now()}@e2e.test`;
  const invitedEmail = `guardian-invited-${Date.now()}@e2e.test`;

  const createdGuardianIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Guardian Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Guardian Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;

    const unaffiliated = await createTestUser(unaffiliatedEmail, password);
    unaffiliatedUserId = unaffiliated.id;

    const invited = await createTestUser(invitedEmail, password);
    invitedUserId = invited.id;
    invitedMembershipId = (await createTestMembership(invitedUserId, tenantAId, 'STAFF', 'INVITED')).id;
  });

  afterAll(async () => {
    if (createdGuardianIds.length) {
      await superuserPrisma.guardian.deleteMany({ where: { id: { in: createdGuardianIds } } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId, staffAId, ownerBId, unaffiliatedUserId, invitedUserId],
      membershipIds: [membershipOwnerAId, membershipStaffAId, membershipOwnerBId, invitedMembershipId],
      userIds: [ownerAId, staffAId, ownerBId, unaffiliatedUserId, invitedUserId],
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

  it('rejects an unauthenticated create', async () => {
    const res = await request(app.getHttpServer())
      .post('/guardians')
      .send({ firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid input (missing lastName)', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/guardians').send({ firstName: 'Jordan', phone: '555-0100' });
    expect(res.status).toBe(400);
  });

  it('rejects a guardian with neither phone nor email', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/guardians').send({ firstName: 'Jordan', lastName: 'NoContact' });
    expect(res.status).toBe(400);
  });

  it('forbids STAFF from creating a guardian (403)', async () => {
    const agent = await loginAs(staffAEmail);
    const res = await agent
      .post('/guardians')
      .send({ firstName: 'Jordan', lastName: 'Rivera', phone: '555-0100' });
    expect(res.status).toBe(403);
  });

  it('allows OWNER to create a guardian with just a phone, or just an email, and records createdBy', async () => {
    const agent = await loginAs(ownerAEmail);

    const phoneOnlyRes = await agent
      .post('/guardians')
      .send({ firstName: 'Phone', lastName: 'Only', phone: '555-0101' });
    expect(phoneOnlyRes.status).toBe(201);
    expect(phoneOnlyRes.body.createdBy).toBe(ownerAId);
    createdGuardianIds.push(phoneOnlyRes.body.id);

    const emailOnlyRes = await agent
      .post('/guardians')
      .send({ firstName: 'Email', lastName: 'Only', email: 'email.only@e2e.test' });
    expect(emailOnlyRes.status).toBe(201);
    createdGuardianIds.push(emailOnlyRes.body.id);
  });

  it('rejects linking userId to a user with no membership in this tenant', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/guardians').send({
      firstName: 'No',
      lastName: 'Membership',
      phone: '555-0102',
      userId: unaffiliatedUserId,
    });
    expect(res.status).toBe(400);
  });

  it('rejects linking userId to a user whose membership is not ACTIVE', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/guardians').send({
      firstName: 'Not',
      lastName: 'Active',
      phone: '555-0103',
      userId: invitedUserId,
    });
    expect(res.status).toBe(400);
  });

  it('rejects linking userId to a nonexistent user (404)', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/guardians').send({
      firstName: 'Ghost',
      lastName: 'User',
      phone: '555-0104',
      userId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(404);
  });

  it('allows linking userId to a user with an active membership, and rejects a second guardian linking the same user', async () => {
    const agent = await loginAs(ownerAEmail);
    const firstRes = await agent.post('/guardians').send({
      firstName: 'Linked',
      lastName: 'Owner',
      phone: '555-0105',
      userId: ownerAId,
    });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.userId).toBe(ownerAId);
    createdGuardianIds.push(firstRes.body.id);

    const secondRes = await agent.post('/guardians').send({
      firstName: 'Linked',
      lastName: 'Again',
      phone: '555-0106',
      userId: ownerAId,
    });
    expect(secondRes.status).toBe(409);
  });

  it('allows re-submitting the same userId on update without a false self-conflict', async () => {
    const agent = await loginAs(ownerAEmail);
    const createRes = await agent.post('/guardians').send({
      firstName: 'SelfUpdate',
      lastName: 'NoConflict',
      phone: '555-0109',
      userId: staffAId,
    });
    expect(createRes.status).toBe(201);
    createdGuardianIds.push(createRes.body.id);

    const updateRes = await agent
      .patch(`/guardians/${createRes.body.id}`)
      .send({ phone: '555-0110', userId: staffAId });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.userId).toBe(staffAId);
  });

  it('gets a guardian by id, 404s for unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const okRes = await agent.get(`/guardians/${createdGuardianIds[0]}`);
    expect(okRes.status).toBe(200);

    const missingRes = await agent.get('/guardians/00000000-0000-0000-0000-000000000000');
    expect(missingRes.status).toBe(404);
  });

  it('lists, filters by name, and sorts', async () => {
    const agent = await loginAs(ownerAEmail);
    const listRes = await agent.get('/guardians?pageSize=100');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);

    const filterRes = await agent.get('/guardians?name=phone');
    expect(
      filterRes.body.data.every((g: { firstName: string; lastName: string }) =>
        `${g.firstName} ${g.lastName}`.toLowerCase().includes('phone'),
      ),
    ).toBe(true);

    const sortRes = await agent.get('/guardians?sortBy=lastName&sortOrder=asc&pageSize=100');
    const lastNames = sortRes.body.data.map((g: { lastName: string }) => g.lastName);
    expect([...lastNames].sort()).toEqual(lastNames);
  });

  it('allows OWNER to update and records updatedBy; forbids STAFF from updating', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const updateRes = await ownerAgent
      .patch(`/guardians/${createdGuardianIds[0]}`)
      .send({ phone: '555-9999' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.phone).toBe('555-9999');
    expect(updateRes.body.updatedBy).toBe(ownerAId);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent
      .patch(`/guardians/${createdGuardianIds[0]}`)
      .send({ phone: '555-0000' });
    expect(forbiddenRes.status).toBe(403);
  });

  it('forbids STAFF from deleting; OWNER can soft-delete and it then 404s', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const createRes = await ownerAgent
      .post('/guardians')
      .send({ firstName: 'ToDelete', lastName: 'Guardian', phone: '555-0107' });
    createdGuardianIds.push(createRes.body.id);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent.delete(`/guardians/${createRes.body.id}`);
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ownerAgent.delete(`/guardians/${createRes.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await ownerAgent.get(`/guardians/${createRes.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it("tenant B cannot see, fetch, or modify tenant A's guardians (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const createRes = await agentA
      .post('/guardians')
      .send({ firstName: 'Isolated', lastName: 'GuardianA', phone: '555-0108' });
    createdGuardianIds.push(createRes.body.id);
    const guardianId = createRes.body.id;

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/guardians?pageSize=100');
    expect(listAsB.body.data.map((g: { id: string }) => g.id)).not.toContain(guardianId);

    const getAsB = await agentB.get(`/guardians/${guardianId}`);
    expect(getAsB.status).toBe(404);

    const updateAsB = await agentB.patch(`/guardians/${guardianId}`).send({ phone: '555-0000' });
    expect(updateAsB.status).toBe(404);

    const confirmAsA = await agentA.get(`/guardians/${guardianId}`);
    expect(confirmAsA.body.phone).toBe('555-0108');
  });
});
