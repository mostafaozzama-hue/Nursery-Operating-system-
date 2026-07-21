import { createHash, randomBytes } from 'crypto';
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

describe('Password reset flow (e2e)', () => {
  let app: INestApplication;
  const password = 'CorrectHorseBattery1';

  let tenantId: string;
  let userId: string;
  let membershipId: string;
  const email = `pwreset-${Date.now()}@e2e.test`;

  const createdUserIds: string[] = [];
  const createdMembershipIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    const tenant = await createTestTenant(`E2E Password Reset Tenant ${Date.now()}`);
    tenantId = tenant.id;
    const user = await createTestUser(email, password);
    userId = user.id;
    membershipId = (await createTestMembership(userId, tenantId, 'OWNER')).id;
  });

  afterAll(async () => {
    await superuserPrisma.passwordResetToken.deleteMany({
      where: { userId: { in: [userId, ...createdUserIds] } },
    });
    await cleanupTestData({
      refreshTokenUserIds: [userId, ...createdUserIds],
      membershipIds: [membershipId, ...createdMembershipIds],
      userIds: [userId, ...createdUserIds],
      tenantIds: [tenantId],
    });
    await app.close();
  });

  async function getLatestResetToken(forUserId: string) {
    return superuserPrisma.passwordResetToken.findFirst({
      where: { userId: forUserId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * The raw token is never exposed via the API by design (unlike an
   * invite), so there's no black-box way to recover one issued through
   * forgot-password. To exercise reset-password's actual success/failure
   * paths, seed a PasswordResetToken row directly with a token *we* choose,
   * hashing it exactly the way TokenService.hashToken does (SHA-256) - the
   * server then finds it by hash the same way it would for a real one.
   */
  function seedResetToken(
    forUserId: string,
    overrides: Partial<{ expiresAt: Date; usedAt: Date | null }> = {},
  ) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    return superuserPrisma.passwordResetToken
      .create({
        data: {
          userId: forUserId,
          tokenHash,
          expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
          usedAt: overrides.usedAt ?? null,
        },
      })
      .then((row) => ({ rawToken, row }));
  }

  /** A fresh, disposable user for tests that actually change a password - avoids interfering with other tests' shared credentials. */
  async function createDisposableUser(label: string) {
    const disposableEmail = `pwreset-${label}-${Date.now()}@e2e.test`;
    const user = await createTestUser(disposableEmail, password);
    const disposableTenant = await createTestTenant(`E2E Password Reset ${label} Tenant ${Date.now()}`);
    const membership = await createTestMembership(user.id, disposableTenant.id, 'OWNER');
    createdUserIds.push(user.id);
    createdMembershipIds.push(membership.id);
    return { userId: user.id, email: disposableEmail, tenantId: disposableTenant.id };
  }

  it('always responds identically whether or not the email exists, and never returns a token', async () => {
    const existingRes = await request(app.getHttpServer()).post('/auth/forgot-password').send({ email });
    const unknownRes = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nobody-pwreset@e2e.test' });

    expect(existingRes.status).toBe(unknownRes.status);
    expect(existingRes.status).toBe(204);
    expect(existingRes.body).toEqual({});
    expect(unknownRes.body).toEqual({});
  });

  it('persists a hashed, single-use reset token for an existing user', async () => {
    await request(app.getHttpServer()).post('/auth/forgot-password').send({ email });

    const stored = await getLatestResetToken(userId);
    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).toEqual(expect.any(String));
    expect(stored?.tokenHash.length).toBeGreaterThanOrEqual(64); // sha256 hex digest length
    expect(stored?.usedAt).toBeNull();
  });

  it('a second forgot-password call invalidates the first token', async () => {
    await request(app.getHttpServer()).post('/auth/forgot-password').send({ email });
    const first = await getLatestResetToken(userId);

    await request(app.getHttpServer()).post('/auth/forgot-password').send({ email });

    const firstAfterSecondCall = await superuserPrisma.passwordResetToken.findUnique({
      where: { id: first!.id },
    });
    expect(firstAfterSecondCall?.usedAt).not.toBeNull();
  });

  it('rejects reset-password with an unknown token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'BrandNewPassword1' });
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const disposable = await createDisposableUser('expired');
    const { rawToken } = await seedResetToken(disposable.userId, { expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'BrandNewPassword1' });
    expect(res.status).toBe(401);
  });

  it('rejects an already-used token', async () => {
    const disposable = await createDisposableUser('already-used');
    const { rawToken } = await seedResetToken(disposable.userId, { usedAt: new Date() });
    const res = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'BrandNewPassword1' });
    expect(res.status).toBe(401);
  });

  it('succeeds end-to-end: changes the password, rejects the old one, and invalidates existing sessions', async () => {
    const disposable = await createDisposableUser('success');
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent.post('/auth/login').send({ email: disposable.email, password });
    expect(loginRes.status).toBe(201);

    const { rawToken } = await seedResetToken(disposable.userId);
    const resetRes = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'BrandNewPassword1' });
    expect(resetRes.status).toBe(204);

    // The session that existed before the reset must now be invalidated.
    const refreshAfterResetRes = await agent.post('/auth/refresh');
    expect(refreshAfterResetRes.status).toBe(401);

    const oldPasswordLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: disposable.email, password });
    expect(oldPasswordLoginRes.status).toBe(401);

    const newPasswordLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: disposable.email, password: 'BrandNewPassword1' });
    expect(newPasswordLoginRes.status).toBe(201);
  });

  it('rejects reusing the same token for a second reset', async () => {
    const disposable = await createDisposableUser('reuse');
    const { rawToken } = await seedResetToken(disposable.userId);

    const firstRes = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'SomeOtherPassword1' });
    expect(firstRes.status).toBe(204);

    const secondRes = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: rawToken, newPassword: 'YetAnotherPassword1' });
    expect(secondRes.status).toBe(401);
  });

  it('serializes two concurrent reset attempts with the same token so exactly one succeeds', async () => {
    const disposable = await createDisposableUser('concurrent');
    const { rawToken } = await seedResetToken(disposable.userId);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, newPassword: 'ConcurrentPasswordOne1' }),
      request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: rawToken, newPassword: 'ConcurrentPasswordTwo1' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([204, 401]);
  });
});
