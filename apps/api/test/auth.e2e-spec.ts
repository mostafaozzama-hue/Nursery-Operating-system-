import { generateKeyPairSync } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import {
  cleanupTestData,
  createTestMembership,
  createTestTenant,
  createTestUser,
} from './utils/test-db';
import { createTestApp } from './utils/test-app';

describe('Identity auth flows (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let userId: string;
  let membershipId: string;
  const email = `owner-${Date.now()}@e2e.test`;
  const password = 'CorrectHorseBattery1';

  let noMembershipUserId: string;
  const noMembershipEmail = `no-membership-${Date.now()}@e2e.test`;

  let multiUserId: string;
  let tenantAId: string;
  let tenantBId: string;
  let membershipAId: string;
  let membershipBId: string;
  const multiEmail = `multi-${Date.now()}@e2e.test`;

  beforeAll(async () => {
    app = await createTestApp();

    const tenant = await createTestTenant(`E2E Auth Tenant ${Date.now()}`);
    tenantId = tenant.id;
    const user = await createTestUser(email, password);
    userId = user.id;
    const membership = await createTestMembership(userId, tenantId, 'OWNER');
    membershipId = membership.id;

    const noMembershipUser = await createTestUser(noMembershipEmail, password);
    noMembershipUserId = noMembershipUser.id;

    const multiUser = await createTestUser(multiEmail, password);
    multiUserId = multiUser.id;
    const tenantA = await createTestTenant(`E2E Multi Tenant A ${Date.now()}`);
    const tenantB = await createTestTenant(`E2E Multi Tenant B ${Date.now()}`);
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;
    const membershipA = await createTestMembership(multiUserId, tenantAId, 'ADMIN');
    const membershipB = await createTestMembership(multiUserId, tenantBId, 'STAFF');
    membershipAId = membershipA.id;
    membershipBId = membershipB.id;
  });

  afterAll(async () => {
    await cleanupTestData({
      refreshTokenUserIds: [userId, noMembershipUserId, multiUserId],
      membershipIds: [membershipId, membershipAId, membershipBId],
      userIds: [userId, noMembershipUserId, multiUserId],
      tenantIds: [tenantId, tenantAId, tenantBId],
    });
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('succeeds with correct credentials and sets httpOnly cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ userId, tenantId, role: 'OWNER', email });

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie.some((c) => c.startsWith('access_token='))).toBe(true);
      expect(setCookie.some((c) => c.startsWith('refresh_token='))).toBe(true);
      expect(setCookie.every((c) => /HttpOnly/i.test(c))).toBe(true);
    });

    it('rejects an invalid password with a generic message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('rejects an unknown email with the same generic message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody-e2e@test.local', password: 'whatever' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('rejects a user with no active membership anywhere', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: noMembershipEmail, password });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No active tenant access');
    });

    it('rejects malformed input (DTO validation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: '' });

      expect(res.status).toBe(400);
    });

    it('logs in a user with multiple active memberships deterministically (earliest activatedAt wins)', async () => {
      const first = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: multiEmail, password });
      const second = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: multiEmail, password });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      // membershipA was created (and thus activated) before membershipB in
      // beforeAll - findActiveMembershipsForUser orders by activatedAt asc,
      // so tenant A must win, consistently, every time - not an arbitrary
      // pick that merely happens to be stable within one test run.
      expect(first.body.tenantId).toBe(tenantAId);
      expect(first.body.role).toBe('ADMIN');
      expect(second.body.tenantId).toBe(tenantAId);
      expect(second.body.role).toBe('ADMIN');
    });
  });

  describe('GET /auth/me', () => {
    it('rejects a request with no authentication', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the current principal for a valid session', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/auth/login').send({ email, password });

      const res = await agent.get('/auth/me');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ userId, tenantId, role: 'OWNER', email });
    });

    it('rejects a malformed token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', ['access_token=not-a-real-jwt']);

      expect(res.status).toBe(401);
    });

    it('rejects a token signed with the wrong key', async () => {
      const rogueJwt = new JwtService({
        privateKey: FAKE_PRIVATE_KEY,
        publicKey: FAKE_PUBLIC_KEY,
        signOptions: { algorithm: 'RS256', expiresIn: '15m' },
      });
      const forged = await rogueJwt.signAsync({
        sub: userId,
        membershipId,
        tenantId,
        role: 'OWNER',
        tokenVersion: 0,
        email,
      });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${forged}`]);

      expect(res.status).toBe(401);
    });

    it('rejects an expired token', async () => {
      const realJwt = new JwtService({
        privateKey: Buffer.from(process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY ?? '', 'base64').toString(
          'utf8',
        ),
        publicKey: Buffer.from(process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY ?? '', 'base64').toString(
          'utf8',
        ),
        signOptions: { algorithm: 'RS256' },
      });
      const expired = await realJwt.signAsync(
        { sub: userId, membershipId, tenantId, role: 'OWNER', tokenVersion: 0, email },
        { expiresIn: '-10s' },
      );

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${expired}`]);

      expect(res.status).toBe(401);
    });

    it('accepts a valid token via Authorization bearer header (not just cookie)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password });
      const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
      const accessCookie = setCookie.find((c) => c.startsWith('access_token='))!;
      const token = accessCookie.split(';')[0].split('=')[1];

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(userId);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rejects when no refresh token is present', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('rotates the refresh token and issues a new access token', async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent.post('/auth/login').send({ email, password });
      const oldRefreshCookie = (loginRes.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('refresh_token='),
      )!;
      const oldRefreshToken = oldRefreshCookie.split(';')[0].split('=')[1];

      const refreshRes = await agent.post('/auth/refresh');

      expect(refreshRes.status).toBe(201);
      const newRefreshCookie = (refreshRes.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('refresh_token='),
      )!;
      const newRefreshToken = newRefreshCookie.split(';')[0].split('=')[1];
      expect(newRefreshToken).not.toBe(oldRefreshToken);
    });

    it('detects reuse of an already-rotated token and revokes the entire chain', async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent.post('/auth/login').send({ email, password });
      const firstRefreshCookie = (loginRes.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('refresh_token='),
      )!;
      const firstRefreshToken = firstRefreshCookie.split(';')[0].split('=')[1];

      // Legitimate rotation.
      const rotateRes = await agent.post('/auth/refresh');
      const secondRefreshCookie = (rotateRes.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('refresh_token='),
      )!;
      const secondRefreshToken = secondRefreshCookie.split(';')[0].split('=')[1];

      // Replay the original (now rotated-out) token.
      const reuseRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${firstRefreshToken}`]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.message).toBe('Refresh token reuse detected');

      // The chain revocation must also invalidate the token issued by the
      // legitimate rotation, even though it was never itself replayed.
      const secondUseRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${secondRefreshToken}`]);

      expect(secondUseRes.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes only the current session, clears cookies, and is idempotent', async () => {
      const agent = request.agent(app.getHttpServer());
      const loginRes = await agent.post('/auth/login').send({ email, password });
      expect(loginRes.status).toBe(201);

      const logoutRes = await agent.post('/auth/logout');
      expect(logoutRes.status).toBe(204);
      const clearedCookies = logoutRes.headers['set-cookie'] as unknown as string[];
      expect(clearedCookies.some((c) => c.startsWith('access_token=;') || /access_token=;/.test(c))).toBe(
        true,
      );

      // The revoked refresh token can no longer be used to refresh.
      const refreshAfterLogoutRes = await agent.post('/auth/refresh');
      expect(refreshAfterLogoutRes.status).toBe(401);

      // Logging out again (no session left) is not an error.
      const secondLogoutRes = await agent.post('/auth/logout');
      expect(secondLogoutRes.status).toBe(204);
    });

    it('does not affect a different session for the same user', async () => {
      const agentA = request.agent(app.getHttpServer());
      const agentB = request.agent(app.getHttpServer());
      await agentA.post('/auth/login').send({ email, password });
      await agentB.post('/auth/login').send({ email, password });

      const logoutRes = await agentA.post('/auth/logout');
      expect(logoutRes.status).toBe(204);

      // Session B is untouched by session A's logout.
      const refreshBRes = await agentB.post('/auth/refresh');
      expect(refreshBRes.status).toBe(201);
    });

    it('works with no prior session at all', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');
      expect(res.status).toBe(204);
    });
  });
});

// A throwaway, unrelated RSA keypair generated fresh for this test run -
// used only to prove a token signed with the wrong key is rejected.
const { privateKey: FAKE_PRIVATE_KEY, publicKey: FAKE_PUBLIC_KEY } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
