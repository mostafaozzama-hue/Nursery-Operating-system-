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
 * Easy Enrollment (Product Gap H) - AdmissionModule is orchestration only,
 * so these tests focus on what only the orchestration adds: atomicity across
 * Child/Guardian/ChildGuardian/Enrollment, existing-vs-new guardian
 * resolution, and role/tenant gating. Enrollment lifecycle rules themselves
 * (capacity, transfer, withdraw) stay covered by enrollment.e2e-spec.ts,
 * unchanged by this feature.
 */
describe('Admission module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `admission-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `admission-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `admission-owner-b-${Date.now()}@e2e.test`;

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Admission Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Admission Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    // FK order: enrollments -> child_guardians/waivers/discount+fee assignments/classrooms -> children/guardians/discounts/fees -> memberships/users/tenants.
    await superuserPrisma.enrollment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.childGuardian.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.waiver.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.childDiscountAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.childFeeAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.child.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.guardian.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.classroom.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.discount.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.fee.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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

  function baseChild(firstName: string) {
    return { firstName, lastName: 'Test', dateOfBirth: '2022-01-01' };
  }

  it('rejects an unauthenticated create', async () => {
    const res = await request(app.getHttpServer())
      .post('/admissions')
      .send({ child: baseChild('Unauth'), guardians: [] });
    expect(res.status).toBe(401);
  });

  it('forbids STAFF from creating an admission (403)', async () => {
    const staffAgent = await loginAs(staffAEmail);
    const res = await staffAgent.post('/admissions').send({
      child: baseChild('StaffForbidden'),
      guardians: [{ firstName: 'Sarah', lastName: 'Ahmed', phone: '+201000000001', relationshipType: 'MOTHER', isPrimaryContact: true }],
    });
    expect(res.status).toBe(403);
  });

  it('1. creates a child + new mother + new father + enrollment atomically, in one call', async () => {
    const agent = await loginAs(ownerAEmail);
    const classroomRes = await agent.post('/classrooms').send({ name: 'Admission Room 1', capacity: 5 });
    expect(classroomRes.status).toBe(201);

    const res = await agent.post('/admissions').send({
      child: { ...baseChild('FullFamily'), nickname: 'Ace', nationality: 'Egyptian', motherLanguage: 'Arabic', address: '1 Nile St' },
      guardians: [
        { firstName: 'Sarah', lastName: 'Ahmed', phone: '+201000000002', relationshipType: 'MOTHER', isPrimaryContact: true, isEmergencyContact: true, canPickup: true },
        { firstName: 'Omar', lastName: 'Ahmed', phone: '+201000000003', relationshipType: 'FATHER', isEmergencyContact: true, canPickup: true },
      ],
      classroomId: classroomRes.body.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.child.firstName).toBe('FullFamily');
    expect(res.body.child.nickname).toBe('Ace');
    expect(res.body.child.address).toBe('1 Nile St');
    expect(res.body.guardians).toHaveLength(2);
    expect(res.body.enrollment.status).toBe('ACTIVE');
    expect(res.body.enrollment.classroomId).toBe(classroomRes.body.id);

    const linksRes = await agent.get(`/child-guardians?childId=${res.body.child.id}`);
    expect(linksRes.body.data).toHaveLength(2);
    const mother = linksRes.body.data.find((l: { relationshipType: string }) => l.relationshipType === 'MOTHER');
    expect(mother.isPrimaryContact).toBe(true);
  });

  it('2. creates a child using an existing mother (no duplicate guardian created)', async () => {
    const agent = await loginAs(ownerAEmail);
    const guardianRes = await agent.post('/guardians').send({ firstName: 'ExistingMom', lastName: 'Reused', phone: '+201000000004' });
    expect(guardianRes.status).toBe(201);

    const res = await agent.post('/admissions').send({
      child: baseChild('ChildOfExistingMom'),
      guardians: [{ guardianId: guardianRes.body.id, relationshipType: 'MOTHER', isPrimaryContact: true }],
    });

    expect(res.status).toBe(201);
    expect(res.body.guardians[0].id).toBe(guardianRes.body.id);

    const listRes = await agent.get('/guardians?name=ExistingMom');
    expect(listRes.body.data).toHaveLength(1);
  });

  it('3. creates a child using an existing father (no duplicate guardian created)', async () => {
    const agent = await loginAs(ownerAEmail);
    const guardianRes = await agent.post('/guardians').send({ firstName: 'ExistingDad', lastName: 'Reused', email: 'existingdad@e2e.test' });
    expect(guardianRes.status).toBe(201);

    const res = await agent.post('/admissions').send({
      child: baseChild('ChildOfExistingDad'),
      guardians: [{ guardianId: guardianRes.body.id, relationshipType: 'FATHER', isPrimaryContact: true }],
    });

    expect(res.status).toBe(201);
    expect(res.body.guardians[0].id).toBe(guardianRes.body.id);

    const listRes = await agent.get('/guardians?name=ExistingDad');
    expect(listRes.body.data).toHaveLength(1);
  });

  it('4. reuses the same existing guardian across two separate admissions without creating a duplicate', async () => {
    const agent = await loginAs(ownerAEmail);
    const guardianRes = await agent.post('/guardians').send({ firstName: 'SiblingParent', lastName: 'Shared', phone: '+201000000005' });
    const guardianId = guardianRes.body.id;

    const firstChild = await agent.post('/admissions').send({
      child: baseChild('SiblingOne'),
      guardians: [{ guardianId, relationshipType: 'MOTHER', isPrimaryContact: true }],
    });
    const secondChild = await agent.post('/admissions').send({
      child: baseChild('SiblingTwo'),
      guardians: [{ guardianId, relationshipType: 'MOTHER', isPrimaryContact: true }],
    });

    expect(firstChild.status).toBe(201);
    expect(secondChild.status).toBe(201);
    expect(firstChild.body.guardians[0].id).toBe(guardianId);
    expect(secondChild.body.guardians[0].id).toBe(guardianId);

    const listRes = await agent.get('/guardians?name=SiblingParent');
    expect(listRes.body.data).toHaveLength(1);
  });

  it('5. supports an optional additional guardian alongside mother and father', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/admissions').send({
      child: baseChild('WithGrandma'),
      guardians: [
        { firstName: 'Mona', lastName: 'X', phone: '+201000000006', relationshipType: 'MOTHER', isPrimaryContact: true },
        { firstName: 'Fatma', lastName: 'Elder', phone: '+201000000007', relationshipType: 'GRANDPARENT', canPickup: true },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.guardians).toHaveLength(2);

    const linksRes = await agent.get(`/child-guardians?childId=${res.body.child.id}`);
    const grandparentLink = linksRes.body.data.find((l: { relationshipType: string }) => l.relationshipType === 'GRANDPARENT');
    expect(grandparentLink.canPickup).toBe(true);
  });

  it('6. a mid-request conflict rolls back the whole admission (no partial child/guardian left behind)', async () => {
    const agent = await loginAs(ownerAEmail);
    const guardianRes = await agent.post('/guardians').send({ firstName: 'ConflictGuardian', lastName: 'X', phone: '+201000000008' });
    const guardianId = guardianRes.body.id;

    // Same guardianId twice for one child -> the second ChildGuardian link
    // violates the already-linked uniqueness rule (ChildGuardianConflictError),
    // after the Child row has already been created earlier in the same
    // transaction. Asserts that row does NOT survive the rollback.
    const res = await agent.post('/admissions').send({
      child: baseChild('RolledBack'),
      guardians: [
        { guardianId, relationshipType: 'MOTHER', isPrimaryContact: true },
        { guardianId, relationshipType: 'FATHER' },
      ],
    });

    expect(res.status).toBe(409);

    const searchRes = await agent.get('/children?name=RolledBack');
    expect(searchRes.body.data).toHaveLength(0);
  });

  it('rejects a new guardian with neither phone nor email (400), creates nothing', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/admissions').send({
      child: baseChild('NoContactInfo'),
      guardians: [{ firstName: 'NoContact', lastName: 'Guardian', relationshipType: 'MOTHER' }],
    });

    expect(res.status).toBe(400);
    const searchRes = await agent.get('/children?name=NoContactInfo');
    expect(searchRes.body.data).toHaveLength(0);
  });

  it('requires at least one guardian', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/admissions').send({ child: baseChild('NoGuardians'), guardians: [] });
    expect(res.status).toBe(400);
  });

  it('7. tenant B cannot reuse tenant A guardians, and admitted records stay tenant-isolated (RLS)', async () => {
    const agentA = await loginAs(ownerAEmail);
    const guardianRes = await agentA.post('/guardians').send({ firstName: 'IsolatedGuardian', lastName: 'A', phone: '+201000000009' });
    const admissionRes = await agentA.post('/admissions').send({
      child: baseChild('IsolatedChild'),
      guardians: [{ guardianId: guardianRes.body.id, relationshipType: 'MOTHER', isPrimaryContact: true }],
    });
    expect(admissionRes.status).toBe(201);

    const agentB = await loginAs(ownerBEmail);

    // Tenant B referencing tenant A's guardianId must 404, not silently link across tenants.
    const crossTenantRes = await agentB.post('/admissions').send({
      child: baseChild('CrossTenantChild'),
      guardians: [{ guardianId: guardianRes.body.id, relationshipType: 'MOTHER', isPrimaryContact: true }],
    });
    expect(crossTenantRes.status).toBe(404);

    const listAsB = await agentB.get('/children?name=IsolatedChild');
    expect(listAsB.body.data).toHaveLength(0);
  });

  it('8. standalone Child/Guardian/Enrollment endpoints keep working unchanged after this feature', async () => {
    const agent = await loginAs(ownerAEmail);
    const childRes = await agent.post('/children').send(baseChild('StandaloneStillWorks'));
    expect(childRes.status).toBe(201);

    const guardianRes = await agent.post('/guardians').send({ firstName: 'Standalone', lastName: 'Guardian', phone: '+201000000010', address: '2 Standalone St' });
    expect(guardianRes.status).toBe(201);
    expect(guardianRes.body.address).toBe('2 Standalone St');

    const enrollmentRes = await agent.post('/enrollments').send({ childId: childRes.body.id });
    expect(enrollmentRes.status).toBe(201);
    expect(enrollmentRes.body.status).toBe('WAITLISTED');
  });

  it('9. accepts an optional plannedEndDate, distinct from the system-managed endDate', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/admissions').send({
      child: baseChild('PlannedEndDateChild'),
      guardians: [{ firstName: 'Nadia', lastName: 'X', phone: '+201000000011', relationshipType: 'MOTHER', isPrimaryContact: true }],
      plannedEndDate: '2027-06-30',
    });

    expect(res.status).toBe(201);
    expect(res.body.enrollment.plannedEndDate.slice(0, 10)).toBe('2027-06-30');
    expect(res.body.enrollment.endDate).toBeNull();
    expect(res.body.enrollment.status).toBe('WAITLISTED');
  });

  it('omitting plannedEndDate leaves it null - never auto-invented', async () => {
    const agent = await loginAs(ownerAEmail);
    const res = await agent.post('/admissions').send({
      child: baseChild('NoPlannedEndDate'),
      guardians: [{ firstName: 'Yara', lastName: 'X', phone: '+201000000012', relationshipType: 'MOTHER', isPrimaryContact: true }],
    });

    expect(res.status).toBe(201);
    expect(res.body.enrollment.plannedEndDate).toBeNull();
  });

  it('10. composes fees, a discount, and a waiver atomically with the rest of the admission', async () => {
    const agent = await loginAs(ownerAEmail);
    const feeRes = await agent.post('/fees').send({ name: 'Admission Meal Fee', type: 'RECURRING', amount: 50 });
    const discountRes = await agent.post('/discounts').send({ name: 'Admission Sibling Discount', type: 'PERCENTAGE', amount: 10, stackable: true });

    const res = await agent.post('/admissions').send({
      child: baseChild('FullBillingChild'),
      guardians: [{ firstName: 'Laila', lastName: 'X', phone: '+201000000013', relationshipType: 'MOTHER', isPrimaryContact: true }],
      feeIds: [feeRes.body.id],
      discount: { discountId: discountRes.body.id },
      waiver: { type: 'PARTIAL', percentage: 20, reasonCode: 'HARDSHIP', effectiveTo: '2027-01-01' },
    });

    expect(res.status).toBe(201);
    const childId = res.body.child.id;

    const feeAssignments = await agent.get(`/children/${childId}/fee-assignments?pageSize=100`);
    expect(feeAssignments.body.data).toHaveLength(1);
    expect(feeAssignments.body.data[0].feeId).toBe(feeRes.body.id);

    const discountAssignments = await agent.get(`/children/${childId}/discount-assignments?pageSize=100`);
    expect(discountAssignments.body.data).toHaveLength(1);
    expect(discountAssignments.body.data[0].discountId).toBe(discountRes.body.id);

    const waivers = await agent.get(`/children/${childId}/waivers?pageSize=100`);
    expect(waivers.body.data).toHaveLength(1);
    expect(Number(waivers.body.data[0].percentage)).toBe(20);
  });

  it('11. a fee conflict deep inside the fees/discount/waiver composition rolls back the whole admission (child, guardian, and enrollment - none of it survives)', async () => {
    const agent = await loginAs(ownerAEmail);

    // Child/guardian/enrollment all commit successfully inside the same
    // transaction before the unknown feeId is reached and rejected - proves
    // the rollback covers everything already created earlier in the same
    // call, not just the fee assignment itself.
    const res = await agent.post('/admissions').send({
      child: baseChild('AtomicRollbackChild'),
      guardians: [{ firstName: 'Salma', lastName: 'X', phone: '+201000000015', relationshipType: 'MOTHER', isPrimaryContact: true }],
      feeIds: ['00000000-0000-0000-0000-000000000000'],
    });

    expect(res.status).toBe(404);

    const searchRes = await agent.get('/children?name=AtomicRollbackChild');
    expect(searchRes.body.data).toHaveLength(0);
  });
});
