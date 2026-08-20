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

/**
 * Waiver bug fix (Easy Enrollment, Product Gap H phase 2). Covers what
 * changed: the exact-duplicate detection guard at create time, and the new
 * soft-delete Remove action. The additive-stacking pricing behavior itself
 * is unchanged and already covered by pricing-engine.service.spec.ts - this
 * file only confirms two genuinely different waivers can still both be
 * created (stacking stays possible).
 */
describe('Waiver module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let membershipOwnerAId: string;
  const ownerAEmail = `waiver-owner-a-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    const tenantA = await createTestTenant(`E2E Waiver Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.waiver.deleteMany({ where: { tenantId: tenantAId } });
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerAId],
      membershipIds: [membershipOwnerAId],
      userIds: [ownerAId],
      tenantIds: [tenantAId],
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
    const res = await agent.post('/children').send({ firstName, lastName: 'Test', dateOfBirth: '2022-01-01' });
    createdChildIds.push(res.body.id);
    return res.body.id as string;
  }

  const baseWaiver = {
    type: 'PARTIAL',
    percentage: 50,
    reasonCode: 'HARDSHIP',
    effectiveFrom: '2026-09-01',
    effectiveTo: '2027-09-01',
  };

  it('rejects an exact duplicate waiver (same type, percentage, reason, overlapping period)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'DuplicateWaiver');

    const firstRes = await agent.post(`/children/${childId}/waivers`).send(baseWaiver);
    expect(firstRes.status).toBe(201);

    const secondRes = await agent.post(`/children/${childId}/waivers`).send(baseWaiver);
    expect(secondRes.status).toBe(409);
  });

  it('still allows two genuinely different waivers to stack (different reasonCode)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'StackingStillWorks');

    const firstRes = await agent.post(`/children/${childId}/waivers`).send(baseWaiver);
    expect(firstRes.status).toBe(201);

    const secondRes = await agent
      .post(`/children/${childId}/waivers`)
      .send({ ...baseWaiver, reasonCode: 'STAFF_BENEFIT', percentage: 25 });
    expect(secondRes.status).toBe(201);

    const listRes = await agent.get(`/children/${childId}/waivers?pageSize=100`);
    expect(listRes.body.data).toHaveLength(2);
  });

  it('allows the same type/percentage/reasonCode again once the periods no longer overlap', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'NonOverlappingOk');

    const firstRes = await agent
      .post(`/children/${childId}/waivers`)
      .send({ ...baseWaiver, effectiveFrom: '2026-01-01', effectiveTo: '2026-06-01' });
    expect(firstRes.status).toBe(201);

    const secondRes = await agent
      .post(`/children/${childId}/waivers`)
      .send({ ...baseWaiver, effectiveFrom: '2026-07-01', effectiveTo: '2026-12-01' });
    expect(secondRes.status).toBe(201);
  });

  it('removes (soft-deletes) a waiver; it no longer appears in listings, and an identical one can be re-added', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'RemoveWaiver');

    const createRes = await agent.post(`/children/${childId}/waivers`).send(baseWaiver);
    expect(createRes.status).toBe(201);

    const removeRes = await agent.delete(`/children/${childId}/waivers/${createRes.body.id}`);
    expect(removeRes.status).toBe(204);

    const listRes = await agent.get(`/children/${childId}/waivers?pageSize=100`);
    expect(listRes.body.data.map((w: { id: string }) => w.id)).not.toContain(createRes.body.id);

    // The duplicate guard only looks at non-deleted rows, so this now succeeds.
    const reCreateRes = await agent.post(`/children/${childId}/waivers`).send(baseWaiver);
    expect(reCreateRes.status).toBe(201);
  });

  it('404s removing an unknown waiver', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'RemoveUnknown');
    const res = await agent.delete(`/children/${childId}/waivers/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it('forbids STAFF from removing a waiver (403)', async () => {
    const staffEmail = `waiver-staff-${Date.now()}@e2e.test`;
    const staffUser = await createTestUser(staffEmail, password);
    const staffMembership = await createTestMembership(staffUser.id, tenantAId, 'STAFF');

    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'StaffForbiddenRemoveWaiver');
    const createRes = await ownerAgent.post(`/children/${childId}/waivers`).send(baseWaiver);

    const staffAgent = await loginAs(staffEmail);
    const res = await staffAgent.delete(`/children/${childId}/waivers/${createRes.body.id}`);
    expect(res.status).toBe(403);

    await cleanupTestData({
      refreshTokenUserIds: [staffUser.id],
      membershipIds: [staffMembership.id],
      userIds: [staffUser.id],
    });
  });
});
