import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { cleanupTestData, createTestMembership, createTestTenant, createTestUser, superuserPrisma } from './utils/test-db';

/**
 * Regression coverage for the eligibility bug found live against the
 * Sunrise Nursery MVP trial (Round 3): EnrollmentBillingTermsRepository's
 * resolveChildrenWithEffectiveTerms() carried an extra `billingTerms: {
 * some: {} }` clause that silently excluded ACTIVE/SUSPENDED enrollments
 * with no EnrollmentBillingTerms row from BillingRunService entirely -
 * never reaching PricingEngineService's BillingTermsUnresolvedError path,
 * never logged, never reflected in the run's aggregate status. Per
 * BillingTermsUnresolvedError's own doc comment, "no effective
 * EnrollmentBillingTerms row at all" was always meant to be one of the two
 * Gap #1 cases (docs/SESSION_CHECKPOINT.md §5) - this test exercises that
 * case through the real BillingRunService pipeline, not a mock.
 *
 * Full HTTP/supertest pattern, matching every other *.e2e-spec.ts in this
 * directory - no new test harness introduced.
 */
describe('BillingRun eligibility (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantId: string;
  let ownerId: string;
  let membershipOwnerId: string;
  const ownerEmail = `billing-run-owner-${Date.now()}@e2e.test`;

  let planId: string;
  let feeId: string;
  let classroomId: string;
  let guardianId: string;

  const createdChildIds: string[] = [];
  const createdEnrollmentIds: string[] = [];

  // Computed relative to "now" so the test never depends on the wall-clock
  // date it happens to run on. periodStart/periodEnd bracket the current
  // month; the "ended before period" fixture is backdated two months
  // earlier, well clear of that window either way.
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  const endedBeforeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const endedBeforeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 15));

  beforeAll(async () => {
    app = await createTestApp();

    const tenant = await createTestTenant(`E2E BillingRun Tenant ${Date.now()}`);
    tenantId = tenant.id;
    const owner = await createTestUser(ownerEmail, password);
    ownerId = owner.id;
    membershipOwnerId = (await createTestMembership(ownerId, tenantId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.invoiceLineItem.deleteMany({ where: { tenantId } });
    await superuserPrisma.invoice.deleteMany({ where: { tenantId } });
    await superuserPrisma.billingRun.deleteMany({ where: { tenantId } });
    await superuserPrisma.enrollmentBillingTerms.deleteMany({ where: { tenantId } });
    if (createdEnrollmentIds.length) {
      await superuserPrisma.enrollment.deleteMany({ where: { id: { in: createdEnrollmentIds } } });
    }
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    if (guardianId) {
      await superuserPrisma.guardian.deleteMany({ where: { id: guardianId } });
    }
    if (planId) {
      await superuserPrisma.planFee.deleteMany({ where: { planId } });
      await superuserPrisma.planPrice.deleteMany({ where: { planId } });
      await superuserPrisma.plan.deleteMany({ where: { id: planId } });
    }
    if (feeId) {
      await superuserPrisma.fee.deleteMany({ where: { id: feeId } });
    }
    if (classroomId) {
      await superuserPrisma.classroom.deleteMany({ where: { id: classroomId } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerId],
      membershipIds: [membershipOwnerId],
      userIds: [ownerId],
      tenantIds: [tenantId],
    });
    await app.close();
  });

  async function loginAsOwner() {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/auth/login').send({ email: ownerEmail, password });
    expect(res.status).toBe(201);
    return agent;
  }

  async function createChild(agent: ReturnType<typeof request.agent>, firstName: string) {
    const res = await agent.post('/children').send({ firstName, lastName: 'E2E', dateOfBirth: '2022-01-01' });
    expect(res.status).toBe(201);
    createdChildIds.push(res.body.id);
    return res.body.id as string;
  }

  it('sets up Plan + mandatory Fee + Classroom + Guardian', async () => {
    const owner = await loginAsOwner();

    const planRes = await owner
      .post('/plans')
      .send({ name: 'E2E Full Time', billingCycle: 'MONTHLY', scheduleDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] });
    expect(planRes.status).toBe(201);
    planId = planRes.body.id;

    const priceRes = await owner.post(`/plans/${planId}/prices`).send({ amount: 1000, effectiveFrom: '2000-01-01' });
    expect(priceRes.status).toBe(201);

    const feeRes = await owner.post('/fees').send({ name: 'E2E Supply Fee', type: 'RECURRING', amount: 200 });
    expect(feeRes.status).toBe(201);
    feeId = feeRes.body.id;

    const attachRes = await owner.post(`/plans/${planId}/fees`).send({ feeId, isMandatory: true });
    expect(attachRes.status).toBe(201);

    const classroomRes = await owner.post('/classrooms').send({ name: 'E2E Room', capacity: 10 });
    expect(classroomRes.status).toBe(201);
    classroomId = classroomRes.body.id;

    const guardianRes = await owner.post('/guardians').send({ firstName: 'E2E', lastName: 'Guardian', phone: '555-0100' });
    expect(guardianRes.status).toBe(201);
    guardianId = guardianRes.body.id;
  });

  it('generates PARTIAL_FAILURE with correct per-child outcomes: terms-less child skipped, termed child invoiced, waitlisted/withdrawn/ended-before-period excluded', async () => {
    const owner = await loginAsOwner();

    // 1. Terms-less ACTIVE child - the exact bug case (Nour/Sara in the live trial).
    const termsLessChildId = await createChild(owner, 'TermsLess');
    const termsLessEnrollRes = await owner.post('/enrollments').send({ childId: termsLessChildId, classroomId });
    expect(termsLessEnrollRes.status).toBe(201);
    expect(termsLessEnrollRes.body.status).toBe('ACTIVE');
    createdEnrollmentIds.push(termsLessEnrollRes.body.id);

    // 2. Termed ACTIVE child - the control case (Layla in the live trial).
    const termedChildId = await createChild(owner, 'Termed');
    const termedEnrollRes = await owner
      .post('/enrollments')
      .send({ childId: termedChildId, classroomId, billingTerms: { planId, billingGuardianId: guardianId } });
    expect(termedEnrollRes.status).toBe(201);
    expect(termedEnrollRes.body.status).toBe('ACTIVE');
    createdEnrollmentIds.push(termedEnrollRes.body.id);

    // 3. WAITLISTED - no classroomId, so the service derives WAITLISTED status.
    const waitlistedChildId = await createChild(owner, 'Waitlisted');
    const waitlistedEnrollRes = await owner.post('/enrollments').send({ childId: waitlistedChildId });
    expect(waitlistedEnrollRes.status).toBe(201);
    expect(waitlistedEnrollRes.body.status).toBe('WAITLISTED');
    createdEnrollmentIds.push(waitlistedEnrollRes.body.id);

    // 4. WITHDRAWN - enrolled with terms, then withdrawn.
    const withdrawnChildId = await createChild(owner, 'Withdrawn');
    const withdrawnEnrollRes = await owner
      .post('/enrollments')
      .send({ childId: withdrawnChildId, classroomId, billingTerms: { planId, billingGuardianId: guardianId } });
    expect(withdrawnEnrollRes.status).toBe(201);
    createdEnrollmentIds.push(withdrawnEnrollRes.body.id);
    const withdrawRes = await owner.post(`/enrollments/${withdrawnEnrollRes.body.id}/withdraw`).send({});
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.status).toBe('WITHDRAWN');

    // 5. Ended-before-period - ACTIVE status, but its whole segment (start
    // and end) predates the billing period. POST /enrollments always takes
    // effect "now" (no start-date field on the DTO - see
    // CreateEnrollmentDto's own comment), so there is no HTTP-only way to
    // backdate this; the enrollment is created normally then its dates are
    // adjusted directly via the superuser Prisma connection, the same
    // direct-DB-write convention test-db.ts already uses for tenant/user/
    // membership fixtures. This does not exercise any application code path
    // - it only shapes the fixture the real query then reads.
    const endedChildId = await createChild(owner, 'EndedBeforePeriod');
    const endedEnrollRes = await owner.post('/enrollments').send({ childId: endedChildId, classroomId });
    expect(endedEnrollRes.status).toBe(201);
    createdEnrollmentIds.push(endedEnrollRes.body.id);
    await superuserPrisma.enrollment.update({
      where: { id: endedEnrollRes.body.id },
      data: { startDate: endedBeforeStart, endDate: endedBeforeEnd },
    });

    // ---- Trigger the billing run ----
    const runRes = await owner
      .post('/billing-runs')
      .send({ periodStart: isoDate(periodStart), periodEnd: isoDate(periodEnd) });
    expect(runRes.status).toBe(201);
    expect(runRes.body.status).toBe('PARTIAL_FAILURE');
    const billingRunId = runRes.body.id;

    // ---- Exactly one invoice, for the termed child only ----
    const invoicesRes = await owner.get('/invoices').query({ billingRunId, pageSize: 50 });
    expect(invoicesRes.status).toBe(200);
    expect(invoicesRes.body.data).toHaveLength(1);
    const invoice = invoicesRes.body.data[0];
    expect(invoice.childId).toBe(termedChildId);
    expect(invoice.billedToGuardianId).toBe(guardianId);
    expect(invoice.status).toBe('DRAFT');
    expect(Number(invoice.totalAmount)).toBe(1200); // 1000 tuition + 200 mandatory fee

    const lineItemsRes = await owner.get(`/invoices/${invoice.id}/line-items`);
    expect(lineItemsRes.status).toBe(200);
    const sourceTypes = lineItemsRes.body.data.map((li: { sourceType: string }) => li.sourceType).sort();
    expect(sourceTypes).toEqual(['FEE', 'PLAN_TUITION']);

    // ---- No invoice for any of the other four children ----
    for (const childId of [termsLessChildId, waitlistedChildId, withdrawnChildId, endedChildId]) {
      const res = await owner.get('/invoices').query({ childId, pageSize: 50 });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    }
  });

  it('rerunning the same period is idempotent - no duplicate invoices, same run row updated in place', async () => {
    const owner = await loginAsOwner();

    const beforeRes = await owner.get('/billing-runs').query({ pageSize: 50 });
    expect(beforeRes.status).toBe(200);
    const existingRun = beforeRes.body.data.find(
      (r: { periodStart: string }) => r.periodStart.slice(0, 10) === isoDate(periodStart),
    );
    expect(existingRun).toBeDefined();

    const rerunRes = await owner
      .post('/billing-runs')
      .send({ periodStart: isoDate(periodStart), periodEnd: isoDate(periodEnd) });
    expect(rerunRes.status).toBe(201);
    expect(rerunRes.body.id).toBe(existingRun.id); // same BillingRun row, not a new one
    expect(rerunRes.body.status).toBe('PARTIAL_FAILURE');

    const invoicesRes = await owner.get('/invoices').query({ billingRunId: existingRun.id, pageSize: 50 });
    expect(invoicesRes.status).toBe(200);
    expect(invoicesRes.body.data).toHaveLength(1); // still exactly one, not two
  });
});

/**
 * Regression coverage for the eligibility bug found live against the
 * Sunrise Nursery MVP trial (Round D): BillingRunService.run()'s
 * "already fully issued - nothing left to regenerate" guard checked only
 * existingInvoices (rows already attached to this BillingRun), never
 * cross-referencing the current eligible-children list. A period whose
 * only invoice had already been issued could therefore never be
 * regenerated again - even for a child who only became billing-eligible
 * *after* that invoice was issued (live case: Yusuf Mahmoud, enrolled with
 * billing terms after Layla Hassan's August invoice had already been
 * issued). The fix compares existingInvoices against eligibleChildren and
 * only rejects the run when no eligible child is missing an invoice -
 * issued-invoice immutability itself is still enforced entirely by
 * InvoiceRepository.replaceGeneratedLines' own DRAFT-only guard, untouched
 * here.
 *
 * Self-contained fixtures, own tenant - not sharing state with the
 * describe block above, same pattern this file already establishes.
 */
describe('BillingRun rerun after an issued invoice picks up newly eligible children (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantId: string;
  let ownerId: string;
  let membershipOwnerId: string;
  const ownerEmail = `billing-run-rerun-owner-${Date.now()}@e2e.test`;

  let planId: string;
  let classroomId: string;
  let guardianId: string;

  const createdChildIds: string[] = [];
  const createdEnrollmentIds: string[] = [];

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  beforeAll(async () => {
    app = await createTestApp();

    const tenant = await createTestTenant(`E2E BillingRun Rerun Tenant ${Date.now()}`);
    tenantId = tenant.id;
    const owner = await createTestUser(ownerEmail, password);
    ownerId = owner.id;
    membershipOwnerId = (await createTestMembership(ownerId, tenantId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.invoiceLineItem.deleteMany({ where: { tenantId } });
    await superuserPrisma.invoice.deleteMany({ where: { tenantId } });
    await superuserPrisma.billingRun.deleteMany({ where: { tenantId } });
    await superuserPrisma.enrollmentBillingTerms.deleteMany({ where: { tenantId } });
    if (createdEnrollmentIds.length) {
      await superuserPrisma.enrollment.deleteMany({ where: { id: { in: createdEnrollmentIds } } });
    }
    if (createdChildIds.length) {
      await superuserPrisma.child.deleteMany({ where: { id: { in: createdChildIds } } });
    }
    if (guardianId) {
      await superuserPrisma.guardian.deleteMany({ where: { id: guardianId } });
    }
    if (planId) {
      await superuserPrisma.planPrice.deleteMany({ where: { planId } });
      await superuserPrisma.plan.deleteMany({ where: { id: planId } });
    }
    if (classroomId) {
      await superuserPrisma.classroom.deleteMany({ where: { id: classroomId } });
    }
    await cleanupTestData({
      refreshTokenUserIds: [ownerId],
      membershipIds: [membershipOwnerId],
      userIds: [ownerId],
      tenantIds: [tenantId],
    });
    await app.close();
  });

  async function loginAsOwner() {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/auth/login').send({ email: ownerEmail, password });
    expect(res.status).toBe(201);
    return agent;
  }

  async function createChild(agent: ReturnType<typeof request.agent>, firstName: string) {
    const res = await agent.post('/children').send({ firstName, lastName: 'E2E', dateOfBirth: '2022-01-01' });
    expect(res.status).toBe(201);
    createdChildIds.push(res.body.id);
    return res.body.id as string;
  }

  it('sets up Plan + Classroom + Guardian', async () => {
    const owner = await loginAsOwner();

    const planRes = await owner
      .post('/plans')
      .send({ name: 'E2E Rerun Full Time', billingCycle: 'MONTHLY', scheduleDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] });
    expect(planRes.status).toBe(201);
    planId = planRes.body.id;

    const priceRes = await owner.post(`/plans/${planId}/prices`).send({ amount: 4500, effectiveFrom: '2000-01-01' });
    expect(priceRes.status).toBe(201);

    const classroomRes = await owner.post('/classrooms').send({ name: 'E2E Rerun Room', capacity: 10 });
    expect(classroomRes.status).toBe(201);
    classroomId = classroomRes.body.id;

    const guardianRes = await owner.post('/guardians').send({ firstName: 'E2E', lastName: 'Guardian', phone: '555-0200' });
    expect(guardianRes.status).toBe(201);
    guardianId = guardianRes.body.id;
  });

  it('issues child A, then rerunning after child B becomes eligible invoices only B and leaves A untouched', async () => {
    const owner = await loginAsOwner();

    // ---- Child A, billed and issued in the first run ----
    const childAId = await createChild(owner, 'AlreadyIssued');
    const enrollARes = await owner
      .post('/enrollments')
      .send({ childId: childAId, classroomId, billingTerms: { planId, billingGuardianId: guardianId } });
    expect(enrollARes.status).toBe(201);
    createdEnrollmentIds.push(enrollARes.body.id);

    const firstRunRes = await owner
      .post('/billing-runs')
      .send({ periodStart: isoDate(periodStart), periodEnd: isoDate(periodEnd) });
    expect(firstRunRes.status).toBe(201);
    expect(firstRunRes.body.status).toBe('COMPLETED'); // only A eligible so far, nothing to fail on
    const billingRunId = firstRunRes.body.id;

    const firstInvoicesRes = await owner.get('/invoices').query({ billingRunId, pageSize: 50 });
    expect(firstInvoicesRes.status).toBe(200);
    expect(firstInvoicesRes.body.data).toHaveLength(1);
    const invoiceA = firstInvoicesRes.body.data[0];
    expect(invoiceA.childId).toBe(childAId);
    expect(invoiceA.status).toBe('DRAFT');
    expect(Number(invoiceA.totalAmount)).toBe(4500);

    const issueRes = await owner.post(`/invoices/${invoiceA.id}/issue`).send({ dueDate: isoDate(periodEnd) });
    expect(issueRes.status).toBe(201);
    expect(issueRes.body.status).toBe('ISSUED');

    // Snapshot A's invoice + line items exactly as they stand once issued -
    // this is what "completely unchanged" is verified against below.
    const lineItemsBeforeRes = await owner.get(`/invoices/${invoiceA.id}/line-items`);
    expect(lineItemsBeforeRes.status).toBe(200);
    const lineItemIdsBefore = lineItemsBeforeRes.body.data.map((li: { id: string }) => li.id).sort();
    expect(lineItemIdsBefore.length).toBeGreaterThan(0);

    // ---- Child B becomes eligible only now, after A's invoice is issued ----
    const childBId = await createChild(owner, 'NewlyEligible');
    const enrollBRes = await owner
      .post('/enrollments')
      .send({ childId: childBId, classroomId, billingTerms: { planId, billingGuardianId: guardianId } });
    expect(enrollBRes.status).toBe(201);
    createdEnrollmentIds.push(enrollBRes.body.id);

    // ---- Rerun the same period: must NOT reject with BillingRunConflictError ----
    const rerunRes = await owner
      .post('/billing-runs')
      .send({ periodStart: isoDate(periodStart), periodEnd: isoDate(periodEnd) });
    expect(rerunRes.status).toBe(201);
    expect(rerunRes.body.id).toBe(billingRunId); // same run row, not a new one
    expect(rerunRes.body.status).toBe('PARTIAL_FAILURE'); // A's issued invoice can't be regenerated; B succeeds

    // ---- Exactly two invoices now: A (untouched) + B (new DRAFT) ----
    const finalInvoicesRes = await owner.get('/invoices').query({ billingRunId, pageSize: 50 });
    expect(finalInvoicesRes.status).toBe(200);
    expect(finalInvoicesRes.body.data).toHaveLength(2);

    const finalInvoiceA = finalInvoicesRes.body.data.find((i: { childId: string }) => i.childId === childAId);
    const finalInvoiceB = finalInvoicesRes.body.data.find((i: { childId: string }) => i.childId === childBId);

    // B: exactly one new DRAFT invoice, correct tuition-only amount.
    expect(finalInvoiceB).toBeDefined();
    expect(finalInvoiceB.status).toBe('DRAFT');
    expect(Number(finalInvoiceB.totalAmount)).toBe(4500);
    expect(finalInvoiceB.billedToGuardianId).toBe(guardianId);

    // A: completely unchanged - same id, status, amount, due date, updatedAt.
    expect(finalInvoiceA).toBeDefined();
    expect(finalInvoiceA.id).toBe(invoiceA.id);
    expect(finalInvoiceA.status).toBe('ISSUED');
    expect(Number(finalInvoiceA.totalAmount)).toBe(4500);
    expect(finalInvoiceA.dueDate).toBe(issueRes.body.dueDate);
    expect(finalInvoiceA.updatedAt).toBe(issueRes.body.updatedAt);

    // A's line items are the exact same rows, not soft-deleted/recreated.
    const lineItemsAfterRes = await owner.get(`/invoices/${invoiceA.id}/line-items`);
    expect(lineItemsAfterRes.status).toBe(200);
    const lineItemIdsAfter = lineItemsAfterRes.body.data.map((li: { id: string }) => li.id).sort();
    expect(lineItemIdsAfter).toEqual(lineItemIdsBefore);
  });
});
