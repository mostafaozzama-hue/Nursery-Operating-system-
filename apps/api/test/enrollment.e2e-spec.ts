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

describe('Enrollment module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `enrollment-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `enrollment-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `enrollment-owner-b-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];
  const createdClassroomIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Enrollment Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Enrollment Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    // FK order: enrollments -> children/classrooms -> memberships/users/tenants.
    await superuserPrisma.enrollment.deleteMany({
      where: { OR: [{ childId: { in: createdChildIds } }, { tenantId: { in: [tenantAId, tenantBId] } }] },
    });
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId, staffAId, ownerBId],
      membershipIds: [membershipOwnerAId, membershipStaffAId, membershipOwnerBId],
      classroomIds: createdClassroomIds,
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

  async function createChild(agent: ReturnType<typeof request.agent>, firstName: string) {
    const res = await agent
      .post('/children')
      .send({ firstName, lastName: 'Test', dateOfBirth: '2022-01-01' });
    expect(res.status).toBe(201);
    createdChildIds.push(res.body.id);
    return res.body.id as string;
  }

  async function createClassroom(agent: ReturnType<typeof request.agent>, name: string, capacity: number) {
    const res = await agent.post('/classrooms').send({ name, capacity });
    expect(res.status).toBe(201);
    createdClassroomIds.push(res.body.id);
    return res.body.id as string;
  }

  it('rejects an unauthenticated create', async () => {
    const res = await request(app.getHttpServer()).post('/enrollments').send({ childId: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid input (missing childId)', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/enrollments').send({});
    expect(res.status).toBe(400);
  });

  it('forbids STAFF from creating an enrollment (403)', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'StaffForbidden');

    const staffAgent = await loginAs(staffAEmail);
    const res = await staffAgent.post('/enrollments').send({ childId });
    expect(res.status).toBe(403);
  });

  it('creates a WAITLISTED enrollment when no classroom is given, ACTIVE when one is', async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomId = await createClassroom(agent, 'Room Full Lifecycle', 5);

    const waitlistedChildId = await createChild(agent, 'Waitlisted');
    const waitlistedRes = await agent.post('/enrollments').send({ childId: waitlistedChildId });
    expect(waitlistedRes.status).toBe(201);
    expect(waitlistedRes.body.status).toBe('WAITLISTED');
    expect(waitlistedRes.body.classroomId).toBeNull();
    expect(waitlistedRes.body.createdBy).toBe(ownerAId);

    const activeChildId = await createChild(agent, 'ActiveFromCreate');
    const activeRes = await agent.post('/enrollments').send({ childId: activeChildId, classroomId });
    expect(activeRes.status).toBe(201);
    expect(activeRes.body.status).toBe('ACTIVE');
    expect(activeRes.body.classroomId).toBe(classroomId);
  });

  it('rejects a client-supplied status field outright (server always derives it)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'IgnoredStatus');

    const res = await agent.post('/enrollments').send({ childId, status: 'WITHDRAWN' });
    expect(res.status).toBe(400);
  });

  it('rejects a second open enrollment for the same child with 409', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'DuplicateOpen');

    const first = await agent.post('/enrollments').send({ childId });
    expect(first.status).toBe(201);

    const second = await agent.post('/enrollments').send({ childId });
    expect(second.status).toBe(409);
  });

  it('enforces classroom capacity on create', async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomId = await createClassroom(agent, 'Capacity One', 1);

    const firstChildId = await createChild(agent, 'CapacityFirst');
    const firstRes = await agent.post('/enrollments').send({ childId: firstChildId, classroomId });
    expect(firstRes.status).toBe(201);

    const secondChildId = await createChild(agent, 'CapacitySecond');
    const secondRes = await agent.post('/enrollments').send({ childId: secondChildId, classroomId });
    expect(secondRes.status).toBe(409);
  });

  it('gets an enrollment by id, 404s for unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'GetById');
    const createRes = await agent.post('/enrollments').send({ childId });

    const okRes = await agent.get(`/enrollments/${createRes.body.id}`);
    expect(okRes.status).toBe(200);

    const missingRes = await agent.get('/enrollments/00000000-0000-0000-0000-000000000000');
    expect(missingRes.status).toBe(404);
  });

  it('allows OWNER to correct the reason text via PATCH; forbids STAFF', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'PatchReason');
    const createRes = await ownerAgent
      .post('/enrollments')
      .send({ childId, createdReason: 'typo' });

    const patchRes = await ownerAgent
      .patch(`/enrollments/${createRes.body.id}`)
      .send({ createdReason: 'fixed' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.createdReason).toBe('fixed');
    expect(patchRes.body.updatedBy).toBe(ownerAId);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent
      .patch(`/enrollments/${createRes.body.id}`)
      .send({ createdReason: 'nope' });
    expect(forbiddenRes.status).toBe(403);
  });

  it('does not expose a DELETE route', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'NoDelete');
    const createRes = await agent.post('/enrollments').send({ childId });

    const res = await agent.delete(`/enrollments/${createRes.body.id}`);
    expect(res.status).toBe(404);
  });

  it('runs the full lifecycle: create waitlisted -> transfer in -> transfer between rooms -> withdraw -> re-enroll', async () => {
    const agent = await loginAs(ownerAEmail);
    const roomA = await createClassroom(agent, 'Lifecycle Room A', 5);
    const roomB = await createClassroom(agent, 'Lifecycle Room B', 5);
    const childId = await createChild(agent, 'Lifecycle');

    async function openEnrollmentsFor(childId: string) {
      const res = await agent.get(`/enrollments?childId=${childId}&open=true&pageSize=100`);
      expect(res.status).toBe(200);
      return res.body.data;
    }

    const createRes = await agent.post('/enrollments').send({ childId });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('WAITLISTED');
    expect(await openEnrollmentsFor(childId)).toHaveLength(1);

    const transferInRes = await agent
      .post(`/enrollments/${createRes.body.id}/transfer`)
      .send({ newClassroomId: roomA });
    expect(transferInRes.status).toBe(201);
    expect(transferInRes.body.status).toBe('ACTIVE');
    expect(transferInRes.body.classroomId).toBe(roomA);
    expect(await openEnrollmentsFor(childId)).toHaveLength(1);

    const oldEnrollmentAfterTransfer = await agent.get(`/enrollments/${createRes.body.id}`);
    expect(oldEnrollmentAfterTransfer.body.endDate).not.toBeNull();

    const transferBetweenRes = await agent
      .post(`/enrollments/${transferInRes.body.id}/transfer`)
      .send({ newClassroomId: roomB });
    expect(transferBetweenRes.status).toBe(201);
    expect(transferBetweenRes.body.classroomId).toBe(roomB);
    expect(await openEnrollmentsFor(childId)).toHaveLength(1);

    const withdrawRes = await agent.post(`/enrollments/${transferBetweenRes.body.id}/withdraw`).send({
      reason: 'Moved away',
    });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.status).toBe('WITHDRAWN');
    expect(withdrawRes.body.endDate).not.toBeNull();
    expect(await openEnrollmentsFor(childId)).toHaveLength(0);

    const reEnrollRes = await agent.post('/enrollments').send({ childId, classroomId: roomA });
    expect(reEnrollRes.status).toBe(201);
    expect(reEnrollRes.body.status).toBe('ACTIVE');
    expect(await openEnrollmentsFor(childId)).toHaveLength(1);
  });

  it('rejects transferring to the same classroom with 409', async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomId = await createClassroom(agent, 'Same Room Reject', 5);
    const childId = await createChild(agent, 'SameRoom');
    const createRes = await agent.post('/enrollments').send({ childId, classroomId });

    const res = await agent
      .post(`/enrollments/${createRes.body.id}/transfer`)
      .send({ newClassroomId: classroomId });
    expect(res.status).toBe(409);
  });

  it('rejects transferring into a full classroom with 409', async () => {
    const agent = await loginAs(ownerAEmail);
    const fullRoom = await createClassroom(agent, 'Full Room For Transfer', 1);
    const occupantId = await createChild(agent, 'Occupant');
    await agent.post('/enrollments').send({ childId: occupantId, classroomId: fullRoom });

    const transferringChildId = await createChild(agent, 'Transferring');
    const createRes = await agent.post('/enrollments').send({ childId: transferringChildId });

    const res = await agent
      .post(`/enrollments/${createRes.body.id}/transfer`)
      .send({ newClassroomId: fullRoom });
    expect(res.status).toBe(409);
  });

  it('returns 409 (not a silent success) when transferring/withdrawing an already-closed enrollment', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'AlreadyClosed');
    const createRes = await agent.post('/enrollments').send({ childId });

    const withdrawRes = await agent.post(`/enrollments/${createRes.body.id}/withdraw`).send({});
    expect(withdrawRes.status).toBe(200);

    const secondWithdrawRes = await agent.post(`/enrollments/${createRes.body.id}/withdraw`).send({});
    expect(secondWithdrawRes.status).toBe(409);

    const roomId = await createClassroom(agent, 'Post Withdraw Transfer', 5);
    const transferRes = await agent
      .post(`/enrollments/${createRes.body.id}/transfer`)
      .send({ newClassroomId: roomId });
    expect(transferRes.status).toBe(409);
  });

  it('404s transferring/withdrawing an unknown enrollment id', async () => {
    const agent = await loginAs(ownerAEmail);
    const roomId = await createClassroom(agent, 'Unknown Id Room', 5);
    const missingId = '00000000-0000-0000-0000-000000000000';

    const transferRes = await agent.post(`/enrollments/${missingId}/transfer`).send({ newClassroomId: roomId });
    expect(transferRes.status).toBe(404);

    const withdrawRes = await agent.post(`/enrollments/${missingId}/withdraw`).send({});
    expect(withdrawRes.status).toBe(404);
  });

  it('lists, filters by status/childId, and sorts', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'FilterTarget');
    const createRes = await agent.post('/enrollments').send({ childId });

    const byChildRes = await agent.get(`/enrollments?childId=${childId}`);
    expect(byChildRes.status).toBe(200);
    expect(byChildRes.body.data).toHaveLength(1);
    expect(byChildRes.body.data[0].id).toBe(createRes.body.id);

    const byStatusRes = await agent.get(`/enrollments?childId=${childId}&status=WAITLISTED`);
    expect(byStatusRes.body.data).toHaveLength(1);

    const byWrongStatusRes = await agent.get(`/enrollments?childId=${childId}&status=ACTIVE`);
    expect(byWrongStatusRes.body.data).toHaveLength(0);

    const sortRes = await agent.get('/enrollments?sortBy=startDate&sortOrder=asc&pageSize=100');
    expect(sortRes.status).toBe(200);
    const startDates = sortRes.body.data.map((e: { startDate: string }) => e.startDate);
    expect([...startDates].sort()).toEqual(startDates);
  });

  it("tenant B cannot see, fetch, or modify tenant A's enrollments (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const childId = await createChild(agentA, 'IsolatedChild');
    const createRes = await agentA.post('/enrollments').send({ childId });
    const enrollmentId = createRes.body.id;

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/enrollments?pageSize=100');
    expect(listAsB.body.data.map((e: { id: string }) => e.id)).not.toContain(enrollmentId);

    const getAsB = await agentB.get(`/enrollments/${enrollmentId}`);
    expect(getAsB.status).toBe(404);

    const roomBId = await createClassroom(agentB, 'Tenant B Room', 5);
    const transferAsB = await agentB
      .post(`/enrollments/${enrollmentId}/transfer`)
      .send({ newClassroomId: roomBId });
    expect(transferAsB.status).toBe(404);

    const withdrawAsB = await agentB.post(`/enrollments/${enrollmentId}/withdraw`).send({});
    expect(withdrawAsB.status).toBe(404);

    const confirmAsA = await agentA.get(`/enrollments/${enrollmentId}`);
    expect(confirmAsA.body.endDate).toBeNull();
  });
});
