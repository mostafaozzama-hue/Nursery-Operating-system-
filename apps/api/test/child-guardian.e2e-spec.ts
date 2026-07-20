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

describe('ChildGuardian module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `cg-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `cg-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `cg-owner-b-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];
  const createdGuardianIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E ChildGuardian Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E ChildGuardian Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    // FK order: child_guardians -> children/guardians -> memberships/users/tenants.
    await superuserPrisma.childGuardian.deleteMany({
      where: { OR: [{ childId: { in: createdChildIds } }, { tenantId: { in: [tenantAId, tenantBId] } }] },
    });
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    if (createdGuardianIds.length) {
      await superuserPrisma.guardian.deleteMany({ where: { id: { in: createdGuardianIds } } });
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

  async function createChild(agent: ReturnType<typeof request.agent>, firstName: string) {
    const res = await agent
      .post('/children')
      .send({ firstName, lastName: 'Test', dateOfBirth: '2022-01-01' });
    expect(res.status).toBe(201);
    createdChildIds.push(res.body.id);
    return res.body.id as string;
  }

  async function createGuardian(agent: ReturnType<typeof request.agent>, firstName: string) {
    const res = await agent.post('/guardians').send({ firstName, lastName: 'Test', phone: '555-0100' });
    expect(res.status).toBe(201);
    createdGuardianIds.push(res.body.id);
    return res.body.id as string;
  }

  it('rejects an unauthenticated create', async () => {
    const res = await request(app.getHttpServer())
      .post('/child-guardians')
      .send({ childId: 'x', guardianId: 'y', relationshipType: 'MOTHER' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid input (missing relationshipType, bad enum value)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'InvalidInput');
    const guardianId = await createGuardian(agent, 'InvalidInput');

    const missingRes = await agent.post('/child-guardians').send({ childId, guardianId });
    expect(missingRes.status).toBe(400);

    const badEnumRes = await agent
      .post('/child-guardians')
      .send({ childId, guardianId, relationshipType: 'AUNT' });
    expect(badEnumRes.status).toBe(400);
  });

  it('forbids STAFF from creating a link (403)', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'StaffForbidden');
    const guardianId = await createGuardian(ownerAgent, 'StaffForbidden');

    const staffAgent = await loginAs(staffAEmail);
    const res = await staffAgent
      .post('/child-guardians')
      .send({ childId, guardianId, relationshipType: 'MOTHER' });
    expect(res.status).toBe(403);
  });

  it('links a guardian to a child with all relationship types accepted', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'AllTypes');

    for (const relationshipType of ['MOTHER', 'FATHER', 'GRANDPARENT', 'LEGAL_GUARDIAN', 'RELATIVE', 'OTHER']) {
      const guardianId = await createGuardian(agent, `Type-${relationshipType}`);
      const res = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType });
      expect(res.status).toBe(201);
      expect(res.body.relationshipType).toBe(relationshipType);
      expect(res.body.isPrimaryContact).toBe(false);
      expect(res.body.isEmergencyContact).toBe(false);
      expect(res.body.canPickup).toBe(false);
    }
  });

  it('rejects linking the same guardian to the same child twice (409)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'DuplicateLink');
    const guardianId = await createGuardian(agent, 'DuplicateLink');

    const firstRes = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });
    expect(firstRes.status).toBe(201);

    const secondRes = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });
    expect(secondRes.status).toBe(409);
  });

  it('allows re-linking after an unlink (soft-delete does not block re-creation)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'RelinkAfterUnlink');
    const guardianId = await createGuardian(agent, 'RelinkAfterUnlink');

    const firstRes = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });
    expect(firstRes.status).toBe(201);

    const deleteRes = await agent.delete(`/child-guardians/${firstRes.body.id}`);
    expect(deleteRes.status).toBe(204);

    const relinkRes = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });
    expect(relinkRes.status).toBe(201);
  });

  it('rejects a second primary contact for the same child (409), on create and on promote-via-update', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'PrimaryContact');
    const firstGuardianId = await createGuardian(agent, 'FirstPrimary');
    const secondGuardianId = await createGuardian(agent, 'SecondPrimary');

    const firstRes = await agent
      .post('/child-guardians')
      .send({ childId, guardianId: firstGuardianId, relationshipType: 'MOTHER', isPrimaryContact: true });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.isPrimaryContact).toBe(true);

    const secondCreateRes = await agent
      .post('/child-guardians')
      .send({ childId, guardianId: secondGuardianId, relationshipType: 'FATHER', isPrimaryContact: true });
    expect(secondCreateRes.status).toBe(409);

    const secondLinkRes = await agent
      .post('/child-guardians')
      .send({ childId, guardianId: secondGuardianId, relationshipType: 'FATHER' });
    expect(secondLinkRes.status).toBe(201);

    const promoteRes = await agent
      .patch(`/child-guardians/${secondLinkRes.body.id}`)
      .send({ isPrimaryContact: true });
    expect(promoteRes.status).toBe(409);

    // Correct promotion sequence: unset the old primary first, then set the new one.
    const unsetRes = await agent.patch(`/child-guardians/${firstRes.body.id}`).send({ isPrimaryContact: false });
    expect(unsetRes.status).toBe(200);

    const promoteAfterUnsetRes = await agent
      .patch(`/child-guardians/${secondLinkRes.body.id}`)
      .send({ isPrimaryContact: true });
    expect(promoteAfterUnsetRes.status).toBe(200);
    expect(promoteAfterUnsetRes.body.isPrimaryContact).toBe(true);
  });

  it('rejects linking a child and guardian from different tenants (404)', async () => {
    const agentA = await loginAs(ownerAEmail);
    const childId = await createChild(agentA, 'CrossTenantChild');

    const agentB = await loginAs(ownerBEmail);
    const guardianId = await createGuardian(agentB, 'CrossTenantGuardian');

    const res = await agentA.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });
    expect(res.status).toBe(404);
  });

  it('gets a link by id, 404s for unknown id', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'GetById');
    const guardianId = await createGuardian(agent, 'GetById');
    const createRes = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });

    const okRes = await agent.get(`/child-guardians/${createRes.body.id}`);
    expect(okRes.status).toBe(200);

    const missingRes = await agent.get('/child-guardians/00000000-0000-0000-0000-000000000000');
    expect(missingRes.status).toBe(404);
  });

  it('lists and filters by childId, guardianId, and flags', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'FilterChild');
    const guardianId = await createGuardian(agent, 'FilterGuardian');
    const createRes = await agent
      .post('/child-guardians')
      .send({ childId, guardianId, relationshipType: 'GRANDPARENT', canPickup: true });

    const byChildRes = await agent.get(`/child-guardians?childId=${childId}`);
    expect(byChildRes.body.data).toHaveLength(1);
    expect(byChildRes.body.data[0].id).toBe(createRes.body.id);

    const byGuardianRes = await agent.get(`/child-guardians?guardianId=${guardianId}`);
    expect(byGuardianRes.body.data).toHaveLength(1);

    const byCanPickupRes = await agent.get(`/child-guardians?childId=${childId}&canPickup=true`);
    expect(byCanPickupRes.body.data).toHaveLength(1);

    const byNotPrimaryRes = await agent.get(`/child-guardians?childId=${childId}&isPrimaryContact=true`);
    expect(byNotPrimaryRes.body.data).toHaveLength(0);
  });

  it('allows OWNER to update relationship/flags; forbids STAFF; excludes childId/guardianId from update', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'UpdateTarget');
    const guardianId = await createGuardian(ownerAgent, 'UpdateTarget');
    const createRes = await ownerAgent
      .post('/child-guardians')
      .send({ childId, guardianId, relationshipType: 'MOTHER' });

    const updateRes = await ownerAgent
      .patch(`/child-guardians/${createRes.body.id}`)
      .send({ relationshipType: 'LEGAL_GUARDIAN', isEmergencyContact: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.relationshipType).toBe('LEGAL_GUARDIAN');
    expect(updateRes.body.isEmergencyContact).toBe(true);
    expect(updateRes.body.updatedBy).toBe(ownerAId);

    // childId/guardianId aren't accepted by the update DTO - whitelist strips or rejects them.
    const otherChildId = await createChild(ownerAgent, 'ShouldNotMove');
    const attemptMoveRes = await ownerAgent
      .patch(`/child-guardians/${createRes.body.id}`)
      .send({ childId: otherChildId });
    expect(attemptMoveRes.status).toBe(400);

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent
      .patch(`/child-guardians/${createRes.body.id}`)
      .send({ canPickup: true });
    expect(forbiddenRes.status).toBe(403);
  });

  it('forbids STAFF from unlinking; OWNER can unlink (soft-delete) and it then 404s', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const childId = await createChild(ownerAgent, 'UnlinkTarget');
    const guardianId = await createGuardian(ownerAgent, 'UnlinkTarget');
    const createRes = await ownerAgent
      .post('/child-guardians')
      .send({ childId, guardianId, relationshipType: 'MOTHER' });

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenRes = await staffAgent.delete(`/child-guardians/${createRes.body.id}`);
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ownerAgent.delete(`/child-guardians/${createRes.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await ownerAgent.get(`/child-guardians/${createRes.body.id}`);
    expect(getRes.status).toBe(404);
  });

  it('does not cascade when the guardian is soft-deleted (link row is left untouched)', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'CascadeCheckChild');
    const guardianId = await createGuardian(agent, 'CascadeCheckGuardian');
    const linkRes = await agent.post('/child-guardians').send({ childId, guardianId, relationshipType: 'MOTHER' });

    const deleteGuardianRes = await agent.delete(`/guardians/${guardianId}`);
    expect(deleteGuardianRes.status).toBe(204);

    // The link itself is untouched - still fetchable, still pointing at the (now soft-deleted) guardian.
    const linkAfterRes = await agent.get(`/child-guardians/${linkRes.body.id}`);
    expect(linkAfterRes.status).toBe(200);
    expect(linkAfterRes.body.guardianId).toBe(guardianId);
  });

  it("tenant B cannot see, fetch, or modify tenant A's child-guardian links (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const childId = await createChild(agentA, 'IsolatedChild');
    const guardianId = await createGuardian(agentA, 'IsolatedGuardian');
    const createRes = await agentA
      .post('/child-guardians')
      .send({ childId, guardianId, relationshipType: 'MOTHER' });
    const linkId = createRes.body.id;

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/child-guardians?pageSize=100');
    expect(listAsB.body.data.map((l: { id: string }) => l.id)).not.toContain(linkId);

    const getAsB = await agentB.get(`/child-guardians/${linkId}`);
    expect(getAsB.status).toBe(404);

    const updateAsB = await agentB.patch(`/child-guardians/${linkId}`).send({ canPickup: true });
    expect(updateAsB.status).toBe(404);

    const deleteAsB = await agentB.delete(`/child-guardians/${linkId}`);
    expect(deleteAsB.status).toBe(404);

    const confirmAsA = await agentA.get(`/child-guardians/${linkId}`);
    expect(confirmAsA.body.canPickup).toBe(false);
  });
});
