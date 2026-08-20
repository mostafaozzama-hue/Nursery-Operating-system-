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
 * Discount bug fix (Easy Enrollment, Product Gap H phase 2). Covers what
 * changed: the exclusive-vs-stackable conflict check at assignment time,
 * and the new soft-delete Remove action. Existing assign/expire behavior
 * (already unit-tested) isn't re-derived here.
 */
describe('ChildDiscountAssignment module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let membershipOwnerAId: string;
  const ownerAEmail = `discount-assign-owner-a-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];
  const createdDiscountIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    const tenantA = await createTestTenant(`E2E Discount Assignment Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.childDiscountAssignment.deleteMany({ where: { tenantId: tenantAId } });
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    if (createdDiscountIds.length) {
      await superuserPrisma.discount.deleteMany({ where: { id: { in: createdDiscountIds } } });
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

  async function createDiscount(
    agent: ReturnType<typeof request.agent>,
    name: string,
    stackable: boolean,
  ) {
    const res = await agent.post('/discounts').send({ name, type: 'PERCENTAGE', amount: 10, stackable });
    createdDiscountIds.push(res.body.id);
    return res.body.id as string;
  }

  it('allows two different stackable discounts to be open on the same child at once', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'StackableOk');
    const discountA = await createDiscount(agent, 'Stackable A', true);
    const discountB = await createDiscount(agent, 'Stackable B', true);

    const firstRes = await agent
      .post(`/children/${childId}/discount-assignments/${discountA}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(firstRes.status).toBe(201);

    const secondRes = await agent
      .post(`/children/${childId}/discount-assignments/${discountB}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(secondRes.status).toBe(201);
  });

  it('rejects a second exclusive discount while one is already open on the child', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'ExclusiveConflict');
    const discountA = await createDiscount(agent, 'Exclusive A', false);
    const discountB = await createDiscount(agent, 'Exclusive B', false);

    const firstRes = await agent
      .post(`/children/${childId}/discount-assignments/${discountA}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(firstRes.status).toBe(201);

    const secondRes = await agent
      .post(`/children/${childId}/discount-assignments/${discountB}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(secondRes.status).toBe(409);
  });

  it('allows an exclusive discount alongside an already-open stackable one', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'MixedOk');
    const stackable = await createDiscount(agent, 'Mixed Stackable', true);
    const exclusive = await createDiscount(agent, 'Mixed Exclusive', false);

    const stackableRes = await agent
      .post(`/children/${childId}/discount-assignments/${stackable}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(stackableRes.status).toBe(201);

    const exclusiveRes = await agent
      .post(`/children/${childId}/discount-assignments/${exclusive}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(exclusiveRes.status).toBe(201);
  });

  it('removing (soft-deleting) an exclusive discount frees up assigning a different exclusive one', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'RemoveThenReassign');
    const discountA = await createDiscount(agent, 'Removable Exclusive A', false);
    const discountB = await createDiscount(agent, 'Removable Exclusive B', false);

    await agent.post(`/children/${childId}/discount-assignments/${discountA}`).send({ effectiveFrom: '2026-09-01' });

    const removeRes = await agent.delete(`/children/${childId}/discount-assignments/${discountA}`);
    expect(removeRes.status).toBe(204);

    const reassignRes = await agent
      .post(`/children/${childId}/discount-assignments/${discountB}`)
      .send({ effectiveFrom: '2026-09-01' });
    expect(reassignRes.status).toBe(201);

    const listRes = await agent.get(`/children/${childId}/discount-assignments?pageSize=100`);
    const assignmentA = listRes.body.data.find((a: { discountId: string }) => a.discountId === discountA);
    expect(assignmentA).toBeUndefined(); // soft-deleted rows never appear in listings.
  });

  it('404s / conflicts removing a discount that was never assigned or already removed', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'RemoveNothing');
    const discount = await createDiscount(agent, 'Never Assigned', true);

    const res = await agent.delete(`/children/${childId}/discount-assignments/${discount}`);
    expect(res.status).toBe(409);
  });

  it('forbids STAFF from removing a discount assignment (403)', async () => {
    const staffEmail = `discount-assign-staff-${Date.now()}@e2e.test`;
    const staffUser = await createTestUser(staffEmail, password);
    const staffMembership = await createTestMembership(staffUser.id, tenantAId, 'STAFF');

    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'StaffForbiddenRemove');
    const discount = await createDiscount(ownerAgent, 'Staff Forbidden Discount', true);
    await ownerAgent.post(`/children/${childId}/discount-assignments/${discount}`).send({ effectiveFrom: '2026-09-01' });

    const staffAgent = await loginAs(staffEmail);
    const res = await staffAgent.delete(`/children/${childId}/discount-assignments/${discount}`);
    expect(res.status).toBe(403);

    await cleanupTestData({
      refreshTokenUserIds: [staffUser.id],
      membershipIds: [staffMembership.id],
      userIds: [staffUser.id],
    });
  });
});
