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

describe('Attendance module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `attendance-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `attendance-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `attendance-owner-b-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];
  const createdClassroomIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Attendance Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Attendance Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.attendance.deleteMany({
      where: { OR: [{ childId: { in: createdChildIds } }, { tenantId: { in: [tenantAId, tenantBId] } }] },
    });
    await superuserPrisma.enrollment.deleteMany({ where: { childId: { in: createdChildIds } } });
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

  async function createClassroom(agent: ReturnType<typeof request.agent>, name: string) {
    const res = await agent.post('/classrooms').send({ name, capacity: 10 });
    expect(res.status).toBe(201);
    createdClassroomIds.push(res.body.id);
    return res.body.id as string;
  }

  it('rejects an unauthenticated check-in', async () => {
    const res = await request(app.getHttpServer()).post('/attendance/check-in').send({ childId: 'x' });
    expect(res.status).toBe(401);
  });

  it('allows STAFF to check in, check out, and mark absent (operational actions)', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const child1 = await createChild(ownerAgent, 'StaffCheckIn');
    const child2 = await createChild(ownerAgent, 'StaffMarkAbsent');

    const staffAgent = await loginAs(staffAEmail);

    const checkInRes = await staffAgent.post('/attendance/check-in').send({ childId: child1 });
    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.status).toBe('CHECKED_IN');
    expect(checkInRes.body.checkedInBy).toBe(staffAId);

    const checkOutRes = await staffAgent.post(`/attendance/${checkInRes.body.id}/check-out`).send({});
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.status).toBe('CHECKED_OUT');
    expect(checkOutRes.body.checkedOutBy).toBe(staffAId);

    const absentRes = await staffAgent.post('/attendance/absent').send({ childId: child2 });
    expect(absentRes.status).toBe(201);
    expect(absentRes.body.status).toBe('ABSENT');
    expect(absentRes.body.checkInTime).toBeNull();
  });

  it('forbids STAFF from PATCHing a record; OWNER can correct it', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'PatchTarget');
    const checkInRes = await ownerAgent.post('/attendance/check-in').send({ childId });

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent
      .patch(`/attendance/${checkInRes.body.id}`)
      .send({ checkInTime: '08:00' });
    expect(forbiddenRes.status).toBe(403);

    const correctRes = await ownerAgent
      .patch(`/attendance/${checkInRes.body.id}`)
      .send({ checkInTime: '08:00' });
    expect(correctRes.status).toBe(200);
  });

  it('does not expose a DELETE route', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'NoDelete');
    const checkInRes = await agent.post('/attendance/check-in').send({ childId });

    const res = await agent.delete(`/attendance/${checkInRes.body.id}`);
    expect(res.status).toBe(404);
  });

  it('rejects a second attendance record for the same child on the same day, across check-in/absent', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'DuplicateDay');

    const firstRes = await agent.post('/attendance/check-in').send({ childId });
    expect(firstRes.status).toBe(201);

    const secondCheckInRes = await agent.post('/attendance/check-in').send({ childId });
    expect(secondCheckInRes.status).toBe(409);

    const secondAbsentRes = await agent.post('/attendance/absent').send({ childId });
    expect(secondAbsentRes.status).toBe(409);
  });

  it('rejects checking out an already-checked-out record, and checking out an unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'AlreadyCheckedOut');
    const checkInRes = await agent.post('/attendance/check-in').send({ childId });

    const firstCheckOutRes = await agent.post(`/attendance/${checkInRes.body.id}/check-out`).send({});
    expect(firstCheckOutRes.status).toBe(200);

    const secondCheckOutRes = await agent.post(`/attendance/${checkInRes.body.id}/check-out`).send({});
    expect(secondCheckOutRes.status).toBe(409);

    const unknownRes = await agent
      .post('/attendance/00000000-0000-0000-0000-000000000000/check-out')
      .send({});
    expect(unknownRes.status).toBe(404);
  });

  it('rejects checking out a record with no check-in (an absence)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'CheckOutAbsence');
    const absentRes = await agent.post('/attendance/absent').send({ childId });
    expect(absentRes.status).toBe(201);

    const checkOutRes = await agent.post(`/attendance/${absentRes.body.id}/check-out`).send({});
    expect(checkOutRes.status).toBe(409);
  });

  it('rejects a classroom from another tenant (404), accepts a valid one', async () => {
    const agentA = await loginAs(ownerAEmail);
    const agentB = await loginAs(ownerBEmail);
    const classroomBId = await createClassroom(agentB, 'Tenant B Room');
    const childId = await createChild(agentA, 'CrossTenantClassroom');

    const crossTenantRes = await agentA
      .post('/attendance/check-in')
      .send({ childId, classroomId: classroomBId });
    expect(crossTenantRes.status).toBe(404);

    const classroomAId = await createClassroom(agentA, 'Tenant A Room');
    const validRes = await agentA.post('/attendance/check-in').send({ childId, classroomId: classroomAId });
    expect(validRes.status).toBe(201);
    expect(validRes.body.classroomId).toBe(classroomAId);
  });

  it("defaults classroomId from the child's current active enrollment when omitted", async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomId = await createClassroom(agent, 'Enrollment Derived Room');
    const childId = await createChild(agent, 'EnrollmentDerived');

    const enrollRes = await agent.post('/enrollments').send({ childId, classroomId });
    expect(enrollRes.status).toBe(201);

    const checkInRes = await agent.post('/attendance/check-in').send({ childId });
    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.classroomId).toBe(classroomId);
  });

  it('leaves classroomId null when the child has no active enrollment and none is supplied', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'NoEnrollment');

    const checkInRes = await agent.post('/attendance/check-in').send({ childId });
    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.classroomId).toBeNull();
  });

  it('honors an explicit checkInTime/checkOutTime override and round-trips the tenant-local wall-clock time correctly', async () => {
    const tenantNY = await createTestTenant(`E2E Attendance NY Tenant ${Date.now()}`, 'America/New_York');
    const ownerNY = await createTestUser(`attendance-ny-owner-${Date.now()}@e2e.test`, password);
    const membershipNY = await createTestMembership(ownerNY.id, tenantNY.id, 'OWNER');

    try {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent.post('/auth/login').send({
        email: ownerNY.email,
        password,
      });
      expect(loginRes.status).toBe(201);

      const childRes = await agent
        .post('/children')
        .send({ firstName: 'OverrideTime', lastName: 'Test', dateOfBirth: '2022-01-01' });
      expect(childRes.status).toBe(201);

      const checkInRes = await agent
        .post('/attendance/check-in')
        .send({ childId: childRes.body.id, checkInTime: '08:15' });
      expect(checkInRes.status).toBe(201);
      expect(checkInRes.body.checkInTime).toContain('08:15');

      const checkOutRes = await agent
        .post(`/attendance/${checkInRes.body.id}/check-out`)
        .send({ checkOutTime: '17:45' });
      expect(checkOutRes.status).toBe(200);
      expect(checkOutRes.body.checkOutTime).toContain('17:45');

      await superuserPrisma.attendance.deleteMany({ where: { tenantId: tenantNY.id } });
      await superuserPrisma.enrollment.deleteMany({ where: { tenantId: tenantNY.id } });
      await superuserPrisma.child.deleteMany({ where: { tenantId: tenantNY.id } });
    } finally {
      await cleanupTestData({
        refreshTokenUserIds: [ownerNY.id],
        membershipIds: [membershipNY.id],
        userIds: [ownerNY.id],
        tenantIds: [tenantNY.id],
      });
    }
  });

  it('gets a record by id, 404s for unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'GetById');
    const checkInRes = await agent.post('/attendance/check-in').send({ childId });

    const okRes = await agent.get(`/attendance/${checkInRes.body.id}`);
    expect(okRes.status).toBe(200);

    const missingRes = await agent.get('/attendance/00000000-0000-0000-0000-000000000000');
    expect(missingRes.status).toBe(404);
  });

  it('lists and filters by childId, classroomId, and status', async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomId = await createClassroom(agent, 'Filter Room');
    const childId = await createChild(agent, 'FilterChild');
    const checkInRes = await agent.post('/attendance/check-in').send({ childId, classroomId });

    const byChildRes = await agent.get(`/attendance?childId=${childId}`);
    expect(byChildRes.body.data).toHaveLength(1);
    expect(byChildRes.body.data[0].id).toBe(checkInRes.body.id);

    const byClassroomRes = await agent.get(`/attendance?classroomId=${classroomId}`);
    expect(byClassroomRes.body.data.map((a: { id: string }) => a.id)).toContain(checkInRes.body.id);

    const byStatusRes = await agent.get(`/attendance?childId=${childId}&status=CHECKED_IN`);
    expect(byStatusRes.body.data).toHaveLength(1);

    const byWrongStatusRes = await agent.get(`/attendance?childId=${childId}&status=ABSENT`);
    expect(byWrongStatusRes.body.data).toHaveLength(0);
  });

  it("tenant B cannot see, fetch, or modify tenant A's attendance records (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const childId = await createChild(agentA, 'IsolatedChild');
    const checkInRes = await agentA.post('/attendance/check-in').send({ childId });
    const attendanceId = checkInRes.body.id;

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/attendance?pageSize=100');
    expect(listAsB.body.data.map((a: { id: string }) => a.id)).not.toContain(attendanceId);

    const getAsB = await agentB.get(`/attendance/${attendanceId}`);
    expect(getAsB.status).toBe(404);

    const checkOutAsB = await agentB.post(`/attendance/${attendanceId}/check-out`).send({});
    expect(checkOutAsB.status).toBe(404);

    const patchAsB = await agentB.patch(`/attendance/${attendanceId}`).send({ checkInTime: '09:00' });
    expect(patchAsB.status).toBe(404);

    const confirmAsA = await agentA.get(`/attendance/${attendanceId}`);
    expect(confirmAsA.body.status).toBe('CHECKED_IN');
  });
});
