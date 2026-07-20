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

describe('Child module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `child-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `child-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `child-owner-b-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Child Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Child Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    // Children reference tenants via FK - must be deleted before tenants.
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId, staffAId, ownerBId],
      membershipIds: [membershipOwnerAId, membershipStaffAId, membershipOwnerBId],
      userIds: [ownerAId, staffAId, ownerBId],
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
      .post('/children')
      .send({ firstName: 'Ava', lastName: 'Smith', dateOfBirth: '2022-03-15' });
    expect(res.status).toBe(401);
  });

  it('allows OWNER to create a child and records createdBy', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent
      .post('/children')
      .send({ firstName: 'Ava', lastName: 'Smith', dateOfBirth: '2022-03-15' });

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(ownerAId);
    expect(res.body.firstName).toBe('Ava');
    createdChildIds.push(res.body.id);
  });

  it('forbids STAFF from creating a child (403)', async () => {
    const agent = await loginAs(staffAEmail);
    const res = await agent
      .post('/children')
      .send({ firstName: 'Noah', lastName: 'Jones', dateOfBirth: '2021-06-01' });
    expect(res.status).toBe(403);
  });

  it('rejects invalid input (missing firstName, malformed date)', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent
      .post('/children')
      .send({ lastName: 'NoFirstName', dateOfBirth: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('lists, filters by name, and sorts', async () => {
    const agent = await loginAs(ownerAEmail);
    const secondRes = await agent
      .post('/children')
      .send({ firstName: 'Ben', lastName: 'Zeta', dateOfBirth: '2020-01-01' });
    createdChildIds.push(secondRes.body.id);

    const listRes = await agent.get('/children?pageSize=100');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);
    expect(listRes.body.meta).toEqual(
      expect.objectContaining({ page: 1, pageSize: 100 }),
    );

    const filterRes = await agent.get('/children?name=ava');
    expect(filterRes.body.data.every((c: { firstName: string; lastName: string }) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes('ava'),
    )).toBe(true);

    const sortRes = await agent.get('/children?sortBy=lastName&sortOrder=asc&pageSize=100');
    const lastNames = sortRes.body.data.map((c: { lastName: string }) => c.lastName);
    expect([...lastNames].sort()).toEqual(lastNames);
  });

  it('gets a child by id, 404s for unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const okRes = await agent.get(`/children/${createdChildIds[0]}`);
    expect(okRes.status).toBe(200);

    const missingRes = await agent.get('/children/00000000-0000-0000-0000-000000000000');
    expect(missingRes.status).toBe(404);
  });

  it('allows OWNER to update and records updatedBy; forbids STAFF from updating', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const updateRes = await ownerAgent
      .patch(`/children/${createdChildIds[0]}`)
      .send({ gender: 'female' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.gender).toBe('female');
    expect(updateRes.body.updatedBy).toBe(ownerAId);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent
      .patch(`/children/${createdChildIds[0]}`)
      .send({ gender: 'male' });
    expect(forbiddenRes.status).toBe(403);
  });

  it('forbids STAFF from deleting; OWNER can soft-delete and it then 404s', async () => {
    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent.delete(`/children/${createdChildIds[1]}`);
    expect(forbiddenRes.status).toBe(403);

    const ownerAgent = await loginAs(ownerAEmail);
    const deleteRes = await ownerAgent.delete(`/children/${createdChildIds[1]}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await ownerAgent.get(`/children/${createdChildIds[1]}`);
    expect(getRes.status).toBe(404);
  });

  it("tenant B cannot see, fetch, or modify tenant A's children (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const createRes = await agentA
      .post('/children')
      .send({ firstName: 'Isolated', lastName: 'ChildA', dateOfBirth: '2019-05-05' });
    createdChildIds.push(createRes.body.id);
    const childId = createRes.body.id;

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/children?pageSize=100');
    expect(listAsB.body.data.map((c: { id: string }) => c.id)).not.toContain(childId);

    const getAsB = await agentB.get(`/children/${childId}`);
    expect(getAsB.status).toBe(404);

    const updateAsB = await agentB.patch(`/children/${childId}`).send({ gender: 'male' });
    expect(updateAsB.status).toBe(404);

    // Confirm tenant A's data was genuinely untouched.
    const confirmAsA = await agentA.get(`/children/${childId}`);
    expect(confirmAsA.body.gender).toBeNull();
  });
});
