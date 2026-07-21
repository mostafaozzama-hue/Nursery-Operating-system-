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

describe('Invoice module (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantAId: string;
  let ownerAId: string;
  let staffAId: string;
  let membershipOwnerAId: string;
  let membershipStaffAId: string;
  const ownerAEmail = `invoice-owner-a-${Date.now()}@e2e.test`;
  const staffAEmail = `invoice-staff-a-${Date.now()}@e2e.test`;

  let tenantBId: string;
  let ownerBId: string;
  let membershipOwnerBId: string;
  const ownerBEmail = `invoice-owner-b-${Date.now()}@e2e.test`;

  const createdChildIds: string[] = [];
  const createdGuardianIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenantA = await createTestTenant(`E2E Invoice Tenant A ${Date.now()}`);
    tenantAId = tenantA.id;
    const ownerA = await createTestUser(ownerAEmail, password);
    ownerAId = ownerA.id;
    const staffA = await createTestUser(staffAEmail, password);
    staffAId = staffA.id;
    membershipOwnerAId = (await createTestMembership(ownerAId, tenantAId, 'OWNER')).id;
    membershipStaffAId = (await createTestMembership(staffAId, tenantAId, 'STAFF')).id;

    const tenantB = await createTestTenant(`E2E Invoice Tenant B ${Date.now()}`);
    tenantBId = tenantB.id;
    const ownerB = await createTestUser(ownerBEmail, password);
    ownerBId = ownerB.id;
    membershipOwnerBId = (await createTestMembership(ownerBId, tenantBId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.payment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.invoiceLineItem.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await superuserPrisma.invoice.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
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

  async function createDraftInvoice(
    agent: ReturnType<typeof request.agent>,
    overrides: Partial<{ childId: string; billedToGuardianId: string; lineItems: unknown[] }> = {},
  ) {
    const childId = overrides.childId ?? (await createChild(agent, 'InvoiceChild'));
    const billedToGuardianId = overrides.billedToGuardianId ?? (await createGuardian(agent, 'InvoiceGuardian'));
    const res = await agent.post('/invoices').send({
      childId,
      billedToGuardianId,
      ...(overrides.lineItems ? { lineItems: overrides.lineItems } : {}),
    });
    expect(res.status).toBe(201);
    return res.body;
  }

  it('rejects an unauthenticated create', async () => {
    const res = await request(app.getHttpServer()).post('/invoices').send({ childId: 'x', billedToGuardianId: 'y' });
    expect(res.status).toBe(401);
  });

  it('forbids STAFF from creating/issuing/voiding/editing line items, but allows STAFF to record payments', async () => {
    const ownerAgent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(ownerAgent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });

    const staffAgent = await loginAs(staffAEmail);
    const forbiddenCreate = await staffAgent
      .post('/invoices')
      .send({ childId: invoice.childId, billedToGuardianId: invoice.billedToGuardianId });
    expect(forbiddenCreate.status).toBe(403);

    const forbiddenLineItem = await staffAgent
      .post(`/invoices/${invoice.id}/line-items`)
      .send({ description: 'x', quantity: 1, unitAmount: 1 });
    expect(forbiddenLineItem.status).toBe(403);

    const forbiddenIssue = await staffAgent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(forbiddenIssue.status).toBe(403);

    const issueRes = await ownerAgent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(issueRes.status).toBe(201);

    const staffPaymentRes = await staffAgent
      .post(`/invoices/${invoice.id}/payments`)
      .send({ amount: 50, paymentMethod: 'CASH' });
    expect(staffPaymentRes.status).toBe(201);

    const forbiddenVoid = await staffAgent.post(`/invoices/${invoice.id}/void`).send({});
    expect(forbiddenVoid.status).toBe(403);
  });

  it('computes totalAmount from line items and keeps it reconciled through add/update/remove', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent);
    expect(invoice.totalAmount).toBe('0');

    const item1 = await agent
      .post(`/invoices/${invoice.id}/line-items`)
      .send({ description: 'Tuition', quantity: 1, unitAmount: 500 });
    expect(item1.status).toBe(201);
    expect(item1.body.totalAmount).toBe('500');

    const item2 = await agent
      .post(`/invoices/${invoice.id}/line-items`)
      .send({ description: 'Meal plan', quantity: 2, unitAmount: 25 });
    expect(item2.status).toBe(201);
    expect(item2.body.totalAmount).toBe('50');

    const afterAddRes = await agent.get(`/invoices/${invoice.id}`);
    expect(afterAddRes.body.totalAmount).toBe('550');

    const updateRes = await agent
      .patch(`/invoices/${invoice.id}/line-items/${item2.body.id}`)
      .send({ quantity: 4 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.totalAmount).toBe('100');

    const afterUpdateRes = await agent.get(`/invoices/${invoice.id}`);
    expect(afterUpdateRes.body.totalAmount).toBe('600');

    const removeRes = await agent.delete(`/invoices/${invoice.id}/line-items/${item1.body.id}`);
    expect(removeRes.status).toBe(204);

    const afterRemoveRes = await agent.get(`/invoices/${invoice.id}`);
    expect(afterRemoveRes.body.totalAmount).toBe('100');
  });

  it('rejects line-item mutations once the invoice is issued', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    const issueRes = await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(issueRes.status).toBe(201);

    const addRes = await agent
      .post(`/invoices/${invoice.id}/line-items`)
      .send({ description: 'x', quantity: 1, unitAmount: 1 });
    expect(addRes.status).toBe(409);
  });

  it('rejects issuing with no line items, and rejects issuing without a due date', async () => {
    const agent = await loginAs(ownerAEmail);

    const emptyInvoice = await createDraftInvoice(agent);
    const emptyIssueRes = await agent.post(`/invoices/${emptyInvoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(emptyIssueRes.status).toBe(409);

    const noDueDateInvoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    const noDueDateRes = await agent.post(`/invoices/${noDueDateInvoice.id}/issue`).send({});
    expect(noDueDateRes.status).toBe(409);
  });

  it('settles a zero-amount invoice as PAID immediately on issue', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Scholarship - full waiver', quantity: 1, unitAmount: 0 }],
    });
    expect(invoice.totalAmount).toBe('0');

    const issueRes = await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(issueRes.status).toBe(201);
    expect(issueRes.body.status).toBe('PAID');

    const paymentRes = await agent
      .post(`/invoices/${invoice.id}/payments`)
      .send({ amount: 1, paymentMethod: 'CASH' });
    expect(paymentRes.status).toBe(409);
  });

  it('runs the full lifecycle: draft -> issue -> partial payment -> full payment -> PAID', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 200 }],
    });

    const issueRes = await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(issueRes.status).toBe(201);
    expect(issueRes.body.status).toBe('ISSUED');

    const firstPaymentRes = await agent
      .post(`/invoices/${invoice.id}/payments`)
      .send({ amount: 75, paymentMethod: 'CASH' });
    expect(firstPaymentRes.status).toBe(201);

    const afterFirstRes = await agent.get(`/invoices/${invoice.id}`);
    expect(afterFirstRes.body.status).toBe('PARTIALLY_PAID');

    const secondPaymentRes = await agent
      .post(`/invoices/${invoice.id}/payments`)
      .send({ amount: 125, paymentMethod: 'CARD' });
    expect(secondPaymentRes.status).toBe(201);

    const afterSecondRes = await agent.get(`/invoices/${invoice.id}`);
    expect(afterSecondRes.body.status).toBe('PAID');

    const paymentsListRes = await agent.get(`/invoices/${invoice.id}/payments`);
    expect(paymentsListRes.body.data).toHaveLength(2);
  });

  it('rejects a payment that would exceed the outstanding balance', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });

    const overpayRes = await agent
      .post(`/invoices/${invoice.id}/payments`)
      .send({ amount: 150, paymentMethod: 'CASH' });
    expect(overpayRes.status).toBe(409);
  });

  it('rejects a payment against a DRAFT or VOID invoice', async () => {
    const agent = await loginAs(ownerAEmail);

    const draftInvoice = await createDraftInvoice(agent);
    const draftPaymentRes = await agent
      .post(`/invoices/${draftInvoice.id}/payments`)
      .send({ amount: 10, paymentMethod: 'CASH' });
    expect(draftPaymentRes.status).toBe(409);

    const voidInvoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    await agent.post(`/invoices/${voidInvoice.id}/issue`).send({ dueDate: '2099-01-01' });
    const voidRes = await agent.post(`/invoices/${voidInvoice.id}/void`).send({});
    expect(voidRes.status).toBe(201);

    const voidPaymentRes = await agent
      .post(`/invoices/${voidInvoice.id}/payments`)
      .send({ amount: 10, paymentMethod: 'CASH' });
    expect(voidPaymentRes.status).toBe(409);
  });

  it('rejects voiding an already-void invoice', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent);
    const firstVoidRes = await agent.post(`/invoices/${invoice.id}/void`).send({});
    expect(firstVoidRes.status).toBe(201);

    const secondVoidRes = await agent.post(`/invoices/${invoice.id}/void`).send({});
    expect(secondVoidRes.status).toBe(409);
  });

  it('derives OVERDUE at read time without storing it, once the due date has passed', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    const issueRes = await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2020-01-01' });
    expect(issueRes.status).toBe(201);

    const getRes = await agent.get(`/invoices/${invoice.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe('OVERDUE');

    // The stored value is still ISSUED, not OVERDUE - confirm directly against the DB.
    const storedInvoice = await superuserPrisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(storedInvoice?.status).toBe('ISSUED');

    const filterRes = await agent.get('/invoices?status=OVERDUE&pageSize=100');
    expect(filterRes.body.data.map((i: { id: string }) => i.id)).toContain(invoice.id);
  });

  it('does not expose a DELETE route on the invoice itself', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent);
    const res = await agent.delete(`/invoices/${invoice.id}`);
    expect(res.status).toBe(404);
  });

  it('rejects a PATCH once the invoice is no longer DRAFT', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });

    const newGuardianId = await createGuardian(agent, 'NewGuardian');
    const patchRes = await agent.patch(`/invoices/${invoice.id}`).send({ billedToGuardianId: newGuardianId });
    expect(patchRes.status).toBe(409);
  });

  it('rejects a child/guardian from another tenant (404)', async () => {
    const agentA = await loginAs(ownerAEmail);
    const agentB = await loginAs(ownerBEmail);
    const childB = await createChild(agentB, 'TenantBChild');
    const guardianA = await createGuardian(agentA, 'TenantAGuardian');

    const res = await agentA.post('/invoices').send({ childId: childB, billedToGuardianId: guardianA });
    expect(res.status).toBe(404);
  });

  it('lists and filters by childId, guardianId, and status', async () => {
    const agent = await loginAs(ownerAEmail);
    const childId = await createChild(agent, 'FilterChild');
    const guardianId = await createGuardian(agent, 'FilterGuardian');
    const invoice = await createDraftInvoice(agent, { childId, billedToGuardianId: guardianId });

    const byChildRes = await agent.get(`/invoices?childId=${childId}`);
    expect(byChildRes.body.data.map((i: { id: string }) => i.id)).toContain(invoice.id);

    const byGuardianRes = await agent.get(`/invoices?guardianId=${guardianId}`);
    expect(byGuardianRes.body.data.map((i: { id: string }) => i.id)).toContain(invoice.id);

    const byStatusRes = await agent.get(`/invoices?childId=${childId}&status=DRAFT`);
    expect(byStatusRes.body.data).toHaveLength(1);
  });

  it("tenant B cannot see, fetch, or modify tenant A's invoices (RLS isolation)", async () => {
    const agentA = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agentA, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });

    const agentB = await loginAs(ownerBEmail);
    const listAsB = await agentB.get('/invoices?pageSize=100');
    expect(listAsB.body.data.map((i: { id: string }) => i.id)).not.toContain(invoice.id);

    const getAsB = await agentB.get(`/invoices/${invoice.id}`);
    expect(getAsB.status).toBe(404);

    const issueAsB = await agentB.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });
    expect(issueAsB.status).toBe(404);

    const confirmAsA = await agentA.get(`/invoices/${invoice.id}`);
    expect(confirmAsA.body.status).toBe('DRAFT');
  });

  it('serializes two concurrent payments so an overpayment cannot slip through a race', async () => {
    const agent = await loginAs(ownerAEmail);
    const invoice = await createDraftInvoice(agent, {
      lineItems: [{ description: 'Tuition', quantity: 1, unitAmount: 100 }],
    });
    await agent.post(`/invoices/${invoice.id}/issue`).send({ dueDate: '2099-01-01' });

    // Two $60 payments against a $100 invoice: together they'd overpay by
    // $20. Without the invoice-row lock, both could read "paid so far = 0"
    // concurrently and both succeed. With the lock, the second is forced to
    // see the first's result and correctly gets rejected.
    const [first, second] = await Promise.all([
      agent.post(`/invoices/${invoice.id}/payments`).send({ amount: 60, paymentMethod: 'CASH' }),
      agent.post(`/invoices/${invoice.id}/payments`).send({ amount: 60, paymentMethod: 'CASH' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const paymentsRes = await agent.get(`/invoices/${invoice.id}/payments?pageSize=100`);
    expect(paymentsRes.body.data).toHaveLength(1);

    const finalInvoiceRes = await agent.get(`/invoices/${invoice.id}`);
    expect(finalInvoiceRes.body.status).toBe('PARTIALLY_PAID');
  });
});
