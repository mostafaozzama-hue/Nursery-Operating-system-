import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  cleanupTestData,
  createTestMembership,
  createTestTenant,
  createTestUser,
} from './utils/test-db';

describe('RLS tenant isolation (e2e, via Classroom)', () => {
  let app: INestApplication;
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let membershipAId: string;
  let membershipBId: string;
  const password = 'CorrectHorseBattery1';
  const emailA = `rls-a-${Date.now()}@e2e.test`;
  const emailB = `rls-b-${Date.now()}@e2e.test`;
  const createdClassroomIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E RLS Tenant A ${Date.now()}`);
    const tenantB = await createTestTenant(`E2E RLS Tenant B ${Date.now()}`);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    const userA = await createTestUser(emailA, password);
    const userB = await createTestUser(emailB, password);
    userAId = userA.id;
    userBId = userB.id;

    membershipAId = (await createTestMembership(userAId, tenantAId, 'OWNER')).id;
    membershipBId = (await createTestMembership(userBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    await cleanupTestData({
      refreshTokenUserIds: [userAId, userBId],
      classroomIds: createdClassroomIds,
      membershipIds: [membershipAId, membershipBId],
      userIds: [userAId, userBId],
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

  it("tenant B cannot see tenant A's classroom via list, and vice versa", async () => {
    const agentA = await loginAs(emailA);
    const createRes = await agentA
      .post('/classrooms')
      .send({ name: 'Tenant A Only Room', capacity: 7 });
    expect(createRes.status).toBe(201);
    createdClassroomIds.push(createRes.body.id);

    const agentB = await loginAs(emailB);
    const listAsB = await agentB.get('/classrooms?pageSize=100');

    expect(listAsB.status).toBe(200);
    expect(listAsB.body.data.map((c: { name: string }) => c.name)).not.toContain(
      'Tenant A Only Room',
    );

    const listAsA = await agentA.get('/classrooms?pageSize=100');
    expect(listAsA.body.data.map((c: { name: string }) => c.name)).toContain('Tenant A Only Room');
  });

  it("tenant B cannot fetch tenant A's classroom by id directly (404, not leaked data)", async () => {
    const agentA = await loginAs(emailA);
    const createRes = await agentA
      .post('/classrooms')
      .send({ name: 'Tenant A Direct Fetch Room', capacity: 3 });
    createdClassroomIds.push(createRes.body.id);
    const classroomId = createRes.body.id;

    const agentB = await loginAs(emailB);
    const res = await agentB.get(`/classrooms/${classroomId}`);

    expect(res.status).toBe(404);
  });

  it("tenant B cannot update tenant A's classroom by id (404, not 200/403)", async () => {
    const agentA = await loginAs(emailA);
    const createRes = await agentA
      .post('/classrooms')
      .send({ name: 'Tenant A Update Target Room', capacity: 4 });
    createdClassroomIds.push(createRes.body.id);
    const classroomId = createRes.body.id;

    const agentB = await loginAs(emailB);
    const res = await agentB.patch(`/classrooms/${classroomId}`).send({ capacity: 999 });

    expect(res.status).toBe(404);

    // Confirm tenant A's data was genuinely untouched.
    const confirmRes = await agentA.get(`/classrooms/${classroomId}`);
    expect(confirmRes.body.capacity).toBe(4);
  });
});
