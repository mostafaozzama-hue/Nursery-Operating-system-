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

describe('Staff module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `staff-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `staff-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `staff-owner-b-${Date.now()}@e2e.test`;

  let unaffiliatedUserId: string;
  let invitedUserId: string;
  let invitedMembershipId: string;
  const unaffiliatedEmail = `staff-unaffiliated-${Date.now()}@e2e.test`;
  const invitedEmail = `staff-invited-${Date.now()}@e2e.test`;

  const createdStaffIds: string[] = [];
  const createdClassroomIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Staff Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Staff Tenant B ${Date.now()}`);
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
    if (createdStaffIds.length) {
      await superuserPrisma.staff.deleteMany({ where: { id: { in: createdStaffIds } } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId, staffAId, ownerBId, unaffiliatedUserId, invitedUserId],
      membershipIds: [membershipOwnerAId, membershipStaffAId, membershipOwnerBId, invitedMembershipId],
      classroomIds: createdClassroomIds,
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

  async function createClassroom(agent: ReturnType<typeof request.agent>, name: string) {
    const res = await agent.post('/classrooms').send({ name, capacity: 10 });
    expect(res.status).toBe(201);
    createdClassroomIds.push(res.body.id);
    return res.body.id as string;
  }

  it('rejects an unauthenticated create', async () => {
    const res = await request(app.getHttpServer()).post('/staff').send({ position: 'Teacher' });
    expect(res.status).toBe(401);
  });

  it('forbids STAFF from creating a staff record (403), but allows STAFF to read', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const createRes = await ownerAgent.post('/staff').send({ position: 'Teacher' });
    expect(createRes.status).toBe(201);
    createdStaffIds.push(createRes.body.id);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenCreateRes = await staffAgent.post('/staff').send({ position: 'Assistant' });
    expect(forbiddenCreateRes.status).toBe(403);

    const readListRes = await staffAgent.get('/staff?pageSize=100');
    expect(readListRes.status).toBe(200);

    const readOneRes = await staffAgent.get(`/staff/${createRes.body.id}`);
    expect(readOneRes.status).toBe(200);
  });

  it('allows creating a staff record with only some fields set (no required-field pair)', async () => {
    const agent = await loginAs(ownerAEmail);

    const bareRes = await agent.post('/staff').send({});
    expect(bareRes.status).toBe(201);
    expect(bareRes.body.position).toBeNull();
    createdStaffIds.push(bareRes.body.id);

    const withPositionRes = await agent.post('/staff').send({ position: 'Cook', hireDate: '2024-09-01' });
    expect(withPositionRes.status).toBe(201);
    expect(withPositionRes.body.position).toBe('Cook');
    createdStaffIds.push(withPositionRes.body.id);
  });

  it('rejects a classroom from another tenant (404), accepts a valid one, records createdBy', async () => {
    const agentA = await loginAs(ownerAEmail);
    const agentB = await loginAs(ownerBEmail);
    const classroomBId = await createClassroom(agentB, 'Tenant B Room');

    const crossTenantRes = await agentA.post('/staff').send({ position: 'Teacher', classroomId: classroomBId });
    expect(crossTenantRes.status).toBe(404);

    const classroomAId = await createClassroom(agentA, 'Tenant A Room');
    const validRes = await agentA.post('/staff').send({ position: 'Teacher', classroomId: classroomAId });
    expect(validRes.status).toBe(201);
    expect(validRes.body.classroomId).toBe(classroomAId);
    expect(validRes.body.createdBy).toBe(ownerAId);
    createdStaffIds.push(validRes.body.id);
  });

  it('rejects linking userId to a user with no membership in this tenant', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/staff').send({ position: 'Teacher', userId: unaffiliatedUserId });
    expect(res.status).toBe(400);
  });

  it('rejects linking userId to a user whose membership is not ACTIVE', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/staff').send({ position: 'Teacher', userId: invitedUserId });
    expect(res.status).toBe(400);
  });

  it('rejects linking userId to a nonexistent user (404)', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/staff').send({
      position: 'Teacher',
      userId: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(404);
  });

  it('allows linking userId to a user with an active membership, and rejects a second staff record linking the same user', async () => {
    const agent = await loginAs(ownerAEmail);
    const firstRes = await agent.post('/staff').send({ position: 'Teacher', userId: ownerAId });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.userId).toBe(ownerAId);
    createdStaffIds.push(firstRes.body.id);

    const secondRes = await agent.post('/staff').send({ position: 'Assistant', userId: ownerAId });
    expect(secondRes.status).toBe(409);
  });

  it('allows re-submitting the same userId on update without a false self-conflict', async () => {
    const agent = await loginAs(ownerAEmail);
    const createRes = await agent.post('/staff').send({ position: 'Cook', userId: staffAId });
    expect(createRes.status).toBe(201);
    createdStaffIds.push(createRes.body.id);

    const updateRes = await agent
      .patch(`/staff/${createRes.body.id}`)
      .send({ position: 'Head Cook', userId: staffAId });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.userId).toBe(staffAId);
    expect(updateRes.body.position).toBe('Head Cook');
  });

  it('gets a staff record by id, 404s for unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const createRes = await agent.post('/staff').send({ position: 'Teacher' });
    createdStaffIds.push(createRes.body.id);

    const okRes = await agent.get(`/staff/${createRes.body.id}`);
    expect(okRes.status).toBe(200);

    const missingRes = await agent.get('/staff/00000000-0000-0000-0000-000000000000');
    expect(missingRes.status).toBe(404);
  });

  it('lists, filters by classroomId and position, and sorts', async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomId = await createClassroom(agent, 'Filter Room');
    const createRes = await agent.post('/staff').send({ position: 'Librarian', classroomId });
    createdStaffIds.push(createRes.body.id);

    const byClassroomRes = await agent.get(`/staff?classroomId=${classroomId}`);
    expect(byClassroomRes.body.data).toHaveLength(1);
    expect(byClassroomRes.body.data[0].id).toBe(createRes.body.id);

    const byPositionRes = await agent.get('/staff?position=librar');
    expect(
      byPositionRes.body.data.every((s: { position: string }) => s.position.toLowerCase().includes('librar')),
    ).toBe(true);

    const sortRes = await agent.get('/staff?sortBy=createdAt&sortOrder=asc&pageSize=100');
    const createdAts = sortRes.body.data.map((s: { createdAt: string }) => s.createdAt);
    expect([...createdAts].sort()).toEqual(createdAts);
  });

  it('forbids STAFF from updating; OWNER can update and records updatedBy', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const createRes = await ownerAgent.post('/staff').send({ position: 'Teacher' });
    createdStaffIds.push(createRes.body.id);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent.patch(`/staff/${createRes.body.id}`).send({ position: 'Manager' });
    expect(forbiddenRes.status).toBe(403);

    const updateRes = await ownerAgent.patch(`/staff/${createRes.body.id}`).send({ position: 'Manager' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.position).toBe('Manager');
    expect(updateRes.body.updatedBy).toBe(ownerAId);
  });

  it('forbids STAFF from deleting; OWNER can soft-delete and it then 404s', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const createRes = await ownerAgent.post('/staff').send({ position: 'ToDelete' });
    createdStaffIds.push(createRes.body.id);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent.delete(`/staff/${createRes.body.id}`);
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ownerAgent.delete(`/staff/${createRes.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await ownerAgent.get(`/staff/${createRes.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it("tenant B cannot see, fetch, or modify tenant A's staff records (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const createRes = await agentA.post('/staff').send({ position: 'Isolated' });
    createdStaffIds.push(createRes.body.id);
    const staffId = createRes.body.id;

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/staff?pageSize=100');
    expect(listAsB.body.data.map((s: { id: string }) => s.id)).not.toContain(staffId);

    const getAsB = await agentB.get(`/staff/${staffId}`);
    expect(getAsB.status).toBe(404);

    const updateAsB = await agentB.patch(`/staff/${staffId}`).send({ position: 'Hijacked' });
    expect(updateAsB.status).toBe(404);

    const deleteAsB = await agentB.delete(`/staff/${staffId}`);
    expect(deleteAsB.status).toBe(404);

    const confirmAsA = await agentA.get(`/staff/${staffId}`);
    expect(confirmAsA.body.position).toBe('Isolated');
  });
});
