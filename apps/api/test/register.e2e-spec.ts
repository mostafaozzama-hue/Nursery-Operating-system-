import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app';
import { cleanupTestData, superuserPrisma } from './utils/test-db';

describe('POST /auth/register (e2e)', () => {
  let app: INestApplication;
  const createdUserIds: string[] = [];
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanupTestData({
      refreshTokenUserIds: createdUserIds,
      membershipUserIds: createdUserIds,
      userIds: createdUserIds,
      tenantIds: createdTenantIds,
    });
    await app.close();
  });

  it('bootstraps a new tenant + OWNER user + membership and issues session cookies', async () => {
    const email = `register-${Date.now()}@e2e.test`;

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantName: 'E2E Register Tenant', email, password: 'CorrectHorseBattery1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      userId: expect.any(String),
      tenantId: expect.any(String),
      role: 'OWNER',
      email,
    });

    createdUserIds.push(res.body.userId);
    createdTenantIds.push(res.body.tenantId);

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(setCookie.some((c) => c.startsWith('refresh_token='))).toBe(true);

    // The DB state must actually be correct, not just the HTTP response.
    const tenant = await superuserPrisma.tenant.findUnique({ where: { id: res.body.tenantId } });
    expect(tenant?.name).toBe('E2E Register Tenant');

    const membership = await superuserPrisma.tenantMembership.findFirst({
      where: { userId: res.body.userId, tenantId: res.body.tenantId },
      include: { role: true },
    });
    expect(membership?.status).toBe('ACTIVE');
    expect(membership?.role.key).toBe('OWNER');
  });

  it('issues a session that actually works against a protected route', async () => {
    const email = `register-session-${Date.now()}@e2e.test`;
    const agent = request.agent(app.getHttpServer());

    const registerRes = await agent
      .post('/auth/register')
      .send({ tenantName: 'E2E Register Session Tenant', email, password: 'CorrectHorseBattery1' });
    createdUserIds.push(registerRes.body.userId);
    createdTenantIds.push(registerRes.body.tenantId);

    const meRes = await agent.get('/auth/me');

    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual(registerRes.body);
  });

  it('lets the newly registered user log in normally afterward', async () => {
    const email = `register-then-login-${Date.now()}@e2e.test`;
    const password = 'CorrectHorseBattery1';

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantName: 'E2E Register Then Login Tenant', email, password });
    createdUserIds.push(registerRes.body.userId);
    createdTenantIds.push(registerRes.body.tenantId);

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email, password });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body).toEqual(registerRes.body);
  });

  it('rejects a duplicate email with 409, not a raw database error', async () => {
    const email = `register-dup-${Date.now()}@e2e.test`;
    const password = 'CorrectHorseBattery1';

    const first = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantName: 'E2E Register Dup Tenant 1', email, password });
    createdUserIds.push(first.body.userId);
    createdTenantIds.push(first.body.tenantId);

    const second = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantName: 'E2E Register Dup Tenant 2', email, password });

    expect(second.status).toBe(409);
    expect(second.body.message).toBe('Email already in use');
  });

  it.each([
    ['missing tenantName', { email: 'x@e2e.test', password: 'CorrectHorseBattery1' }],
    ['invalid email', { tenantName: 'T', email: 'not-an-email', password: 'CorrectHorseBattery1' }],
    ['password under the 12-character minimum', { tenantName: 'T', email: 'x2@e2e.test', password: 'short' }],
  ])('rejects registration with %s (400)', async (_label, body) => {
    const res = await request(app.getHttpServer()).post('/auth/register').send(body);
    expect(res.status).toBe(400);
  });

  it('accepts a valid IANA timezone and persists it on the tenant; defaults to UTC when omitted', async () => {
    const email = `register-tz-${Date.now()}@e2e.test`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: 'E2E Timezone Tenant',
        email,
        password: 'CorrectHorseBattery1',
        timezone: 'America/New_York',
      });
    expect(res.status).toBe(201);
    createdUserIds.push(res.body.userId);
    createdTenantIds.push(res.body.tenantId);

    const tenant = await superuserPrisma.tenant.findUnique({ where: { id: res.body.tenantId } });
    expect(tenant?.timezone).toBe('America/New_York');

    const defaultEmail = `register-tz-default-${Date.now()}@e2e.test`;
    const defaultRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantName: 'E2E Default Timezone Tenant', email: defaultEmail, password: 'CorrectHorseBattery1' });
    expect(defaultRes.status).toBe(201);
    createdUserIds.push(defaultRes.body.userId);
    createdTenantIds.push(defaultRes.body.tenantId);

    const defaultTenant = await superuserPrisma.tenant.findUnique({ where: { id: defaultRes.body.tenantId } });
    expect(defaultTenant?.timezone).toBe('UTC');
  });

  it('rejects an invalid timezone (400)', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      tenantName: 'E2E Invalid Timezone Tenant',
      email: `register-tz-invalid-${Date.now()}@e2e.test`,
      password: 'CorrectHorseBattery1',
      timezone: 'Not/A_Real_Zone',
    });
    expect(res.status).toBe(400);
  });
});
