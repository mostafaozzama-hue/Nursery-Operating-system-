import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import {
  cleanupTestData,
  createTestMembership,
  createTestTenant,
  createTestUser,
} from './utils/test-db';

describe('Role-based authorization (e2e, via Classroom)', () => {
  let app: INestApplication;
  let tenantId: string;
  let ownerId: string;
  let adminId: string;
  let staffId: string;
  let ownerMembershipId: string;
  let adminMembershipId: string;
  let staffMembershipId: string;
  const password = 'CorrectHorseBattery1';
  const ownerEmail = `authz-owner-${Date.now()}@e2e.test`;
  const adminEmail = `authz-admin-${Date.now()}@e2e.test`;
  const staffEmail = `authz-staff-${Date.now()}@e2e.test`;
  const createdClassroomIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenant = await createTestTenant(`E2E Authz Tenant ${Date.now()}`);
    tenantId = tenant.id;

    const owner = await createTestUser(ownerEmail, password);
    const admin = await createTestUser(adminEmail, password);
    const staff = await createTestUser(staffEmail, password);
    ownerId = owner.id;
    adminId = admin.id;
    staffId = staff.id;

    ownerMembershipId = (await createTestMembership(ownerId, tenantId, 'OWNER')).id;
    adminMembershipId = (await createTestMembership(adminId, tenantId, 'ADMIN')).id;
    staffMembershipId = (await createTestMembership(staffId, tenantId, 'STAFF')).id;
  });

  afterAll(async () => {
    await cleanupTestData({
      refreshTokenUserIds: [ownerId, adminId, staffId],
      classroomIds: createdClassroomIds,
      membershipIds: [ownerMembershipId, adminMembershipId, staffMembershipId],
      userIds: [ownerId, adminId, staffId],
      tenantIds: [tenantId],
    });
    await app.close();
  });

  async function loginAs(email: string) {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    return agent;
  }

  it('rejects an unauthenticated request to create a classroom', async () => {
    const res = await request(app.getHttpServer())
      .post('/classrooms')
      .send({ name: 'No Auth Room', capacity: 5 });

    expect(res.status).toBe(401);
  });

  it('allows OWNER to create a classroom', async () => {
    const agent = await loginAs(ownerEmail);
    const res = await agent.post('/classrooms').send({ name: 'Owner Room', capacity: 10 });

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(ownerId);
    createdClassroomIds.push(res.body.id);
  });

  it('allows ADMIN to create a classroom', async () => {
    const agent = await loginAs(adminEmail);
    const res = await agent.post('/classrooms').send({ name: 'Admin Room', capacity: 8 });

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toBe(adminId);
    createdClassroomIds.push(res.body.id);
  });

  it('forbids STAFF from creating a classroom (403, not 401)', async () => {
    const agent = await loginAs(staffEmail);
    const res = await agent.post('/classrooms').send({ name: 'Staff Attempt Room', capacity: 5 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Insufficient role');
  });

  it('allows STAFF to list classrooms despite being unable to create one', async () => {
    const agent = await loginAs(staffEmail);
    const res = await agent.get('/classrooms');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('forbids STAFF from updating a classroom', async () => {
    const agent = await loginAs(staffEmail);
    const res = await agent
      .patch(`/classrooms/${createdClassroomIds[0]}`)
      .send({ capacity: 99 });

    expect(res.status).toBe(403);
  });

  it('forbids STAFF from deleting a classroom', async () => {
    const agent = await loginAs(staffEmail);
    const res = await agent.delete(`/classrooms/${createdClassroomIds[0]}`);

    expect(res.status).toBe(403);
  });

  it('allows OWNER to update a classroom and records updatedBy', async () => {
    const agent = await loginAs(ownerEmail);
    const res = await agent
      .patch(`/classrooms/${createdClassroomIds[0]}`)
      .send({ capacity: 12 });

    expect(res.status).toBe(200);
    expect(res.body.capacity).toBe(12);
    expect(res.body.updatedBy).toBe(ownerId);
  });
});
