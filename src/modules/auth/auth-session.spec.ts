/**
 * R-05 — JWT/session architecture: integration tests against a REAL
 * PostgreSQL schema.
 *
 * The suite boots the Nest app against a dedicated test database
 * (virgool_auth_session_test, created automatically) so the development
 * database is never touched. OTP delivery is replaced with a recording stub
 * so the tests can drive the real login flow end to end.
 *
 * Covered (spec §19):
 * - access tokens: valid / expired / malformed / tampered / wrong secret /
 *   missing secret (fail-closed), TTL, check-login response hygiene,
 * - OTP login creates a session; the response carries NO refresh token,
 * - refresh: rotation, cookie flags, hash-only storage, missing/garbage/
 *   expired/revoked cookies, reuse detection revoking the whole family,
 *   blocked user → 403, deleted user → 401, concurrent single-winner,
 * - logout: revocation, cookie clearing, idempotence, isolation between users,
 * - Google: redirect carries a one-time code (never a token), single-use,
 *   expiry, blocked user, strict DTO validation,
 * - SameOriginGuard rejects foreign origins on the cookie endpoints.
 *
 * OTP verification protections themselves live in auth-otp.spec.ts (R-01 +
 * R-14) and account deletion cascades in account-deletion.spec.ts — both are
 * re-run as part of the R-05 verification battery.
 */
import { INestApplication } from '@nestjs/common';
import { createAppValidationPipe } from 'src/common/pipes/app-validation.pipe';
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Client } from 'pg';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import request from 'supertest';

import { UserEntity } from '../user/entities/user.entity';
import { ProfileEntity } from '../user/entities/profile.entity';
import { OtpEntity } from '../user/entities/otp.entity';
import { SessionEntity } from './entities/session.entity';
import { OAuthCodeEntity } from './entities/oauth-code.entity';
import { Roles } from 'src/common/enums/role.eunm';
import { UserStatus } from '../user/enums/status.enum';
import { OtpDeliveryService } from '../otp-delivery/otp-delivery.service';
import type { OtpDeliveryMessage } from '../otp-delivery/otp-delivery.types';
import { GoogleAuthController } from './google.controller';
import { TokensService } from './tokens.service';
import type { AppModule as AppModuleType } from '../app/app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_auth_session_test';

describe('JWT/session hardening (R-05)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ds: DataSource;
  const jwt = new JwtService();
  const fixtureUserIds: number[] = [];
  let seq = 0;

  // Recording replacement for OtpDeliveryService — captures login codes.
  const delivered: OtpDeliveryMessage[] = [];
  const deliveryMock = {
    send: jest.fn((message: OtpDeliveryMessage) => {
      delivered.push(message);
      return Promise.resolve();
    }),
  };

  const unique = (prefix: string) =>
    `${prefix}_${Date.now()}_${++seq}_${Math.random().toString(36).slice(2, 7)}`;

  const tokenFor = (userId: number) =>
    jwt.sign(
      { userId },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1y' },
    );

  const appServer = (): Server => app.getHttpServer() as Server;

  const sha = (value: string) =>
    createHash('sha256').update(value).digest('hex');

  const bodyOf = (res: request.Response): Record<string, unknown> =>
    res.body as Record<string, unknown>;

  const setCookiesOf = (res: request.Response): string[] =>
    (res.headers['set-cookie'] ?? []) as unknown as string[];

  /** `name=value` pair for the Cookie header. */
  const cookieFrom = (res: request.Response, name: string): string => {
    const found = setCookiesOf(res).find((c) => c.startsWith(`${name}=`));
    if (!found) throw new Error(`cookie ${name} missing in response`);
    return found.split(';')[0];
  };

  const setCookieOf = (res: request.Response, name: string): string => {
    const found = setCookiesOf(res).find((c) => c.startsWith(`${name}=`));
    if (!found) throw new Error(`set-cookie ${name} missing in response`);
    return found;
  };

  /** Lower-cased attribute segments of a Set-Cookie header (segment 0 is the pair). */
  const cookieAttrs = (setCookie: string): string[] =>
    setCookie.split(';').map((segment) => segment.trim().toLowerCase());

  const rawOf = (pair: string): string => pair.slice(pair.indexOf('=') + 1);

  const lastDelivery = (): OtpDeliveryMessage => {
    const message = delivered[delivered.length - 1];
    if (!message) throw new Error('nothing was delivered');
    return message;
  };

  const userExistence = (payload: {
    method: string;
    type: string;
    username: string;
  }) => request(appServer()).post('/auth/user-existence').send(payload);

  const checkOtp = (code: string, cookie: string) =>
    request(appServer())
      .post('/auth/check-otp')
      .set('Cookie', cookie)
      .send({ code });

  const checkLoginReq = (accessToken: string) =>
    request(appServer())
      .get('/auth/check-login')
      .set('Authorization', `Bearer ${accessToken}`);

  const refreshReq = (cookie?: string, origin?: string) => {
    const req = request(appServer()).post('/auth/refresh');
    if (cookie) req.set('Cookie', cookie);
    if (origin) req.set('Origin', origin);
    return req;
  };

  const logoutReq = (cookie?: string) => {
    const req = request(appServer()).post('/auth/logout');
    if (cookie) req.set('Cookie', cookie);
    return req;
  };

  const exchangeReq = (code: string, extra: Record<string, unknown> = {}) =>
    request(appServer())
      .post('/auth/google/exchange')
      .send({ code, ...extra });

  // ------------------------------------------------------------- repositories

  const users = () => ds.getRepository(UserEntity);
  const profiles = () => ds.getRepository(ProfileEntity);
  const otps = () => ds.getRepository(OtpEntity);
  const sessions = () => ds.getRepository(SessionEntity);
  const oauthCodes = () => ds.getRepository(OAuthCodeEntity);

  const sessionRowByHash = (hash: string) =>
    sessions().findOneBy({ refreshTokenHash: hash });

  // ---------------------------------------------------------------- fixtures

  const createUser = async (opts: { status?: UserStatus } = {}) => {
    const username = unique('r05');
    const email = `${username}@r05.test`;
    const result = await users().insert({
      username,
      email,
      phone: `0912${String(9000000 + seq)}`,
      role: Roles.User,
      status: opts.status ?? UserStatus.Active,
      verify_email: true,
    });
    const id = Number(result.identifiers[0].id);
    fixtureUserIds.push(id);
    return { id, username, email };
  };

  /** Full OTP login: returns the access token + refresh cookie of a session. */
  const loginSession = async () => {
    const user = await createUser();
    const existence = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });
    expect(existence.status).toBe(201);
    const otpCookie = cookieFrom(existence, 'otp');
    const verify = await checkOtp(lastDelivery().code, otpCookie);
    expect(verify.status).toBe(201);
    const refreshCookie = cookieFrom(verify, 'refresh_token');
    return {
      userId: user.id,
      username: user.username,
      accessToken: String(bodyOf(verify).accessToken),
      refreshCookie,
      rawRefresh: rawOf(refreshCookie),
    };
  };

  /** Drives the Google controller's redirect step with a fake passport profile. */
  const googleHandoff = async (email: string) => {
    const controller = await moduleRef.resolve(GoogleAuthController);
    let location = '';
    const req = {
      user: { email, firstName: 'Go', lastName: 'Ogle' },
    } as unknown as Request;
    const res = {
      redirect: (url: string) => {
        location = url;
      },
    } as unknown as Response;
    await controller.googleRedirect(req, res);
    if (!location) throw new Error('redirect URL missing');
    return location;
  };

  // ---------------------------------------------------------------- fixtures

  /** Inserts a handoff code directly (single-use semantics under test). */
  const insertHandoffCode = async (userId: number, ttlMs = 60_000) => {
    const raw = randomBytes(32).toString('base64url');
    await oauthCodes().insert({
      userId,
      codeHash: sha(raw),
      expiresAt: new Date(Date.now() + ttlMs),
      consumedAt: null,
    });
    return raw;
  };

  // ------------------------------------------------------------- test hooks

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads —
    // TypeOrmConfig() reads process.env at module import time.
    process.env.DB_NAME = TEST_DB;
    // Keep the global limiter ACTIVE but deterministic for this suite.
    process.env.RATE_LIMIT_TTL_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100000';
    config();

    const client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
    });
    await client.connect();
    try {
      await client.query(`CREATE DATABASE ${TEST_DB}`);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== '42P04') throw error; // everything but "already exists"
    } finally {
      await client.end();
    }

    // Deferred require: AppModule's TypeORM config reads process.env when the
    // module is first evaluated, so the DB override above must happen first.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../app/app.module') as {
      AppModule: typeof AppModuleType;
    };
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OtpDeliveryService)
      .useValue(deliveryMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      for (const id of fixtureUserIds) {
        try {
          // sessions/oauth codes cascade with the user row itself — this is
          // exactly what the account-deletion contract relies on.
          await users().delete({ id });
          await profiles().delete({ userId: id });
          await otps().delete({ userId: id });
        } catch {
          // best effort — rows may already be gone
        }
      }
      await app.close();
    }
  });

  // =========================================== access tokens (Bearer layer)

  it('valid access token: check-login 200 returns only whitelisted fields', async () => {
    const user = await createUser();
    const res = await checkLoginReq(tokenFor(user.id));
    expect(res.status).toBe(200);
    const body = bodyOf(res);
    expect(body.id).toBe(user.id);
    expect(body.username).toBe(user.username);
    expect(body.role).toBe(Roles.User);
    expect(body.status).toBe(UserStatus.Active);
    // R-05 hygiene: internal fields must be excluded by construction.
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('otpId');
    expect(body).not.toHaveProperty('new_email');
    expect(body).not.toHaveProperty('new_Phone');
    expect(body).not.toHaveProperty('otp');
    expect(body).not.toHaveProperty('profile');
  });

  it('missing access token is rejected (401)', async () => {
    const res = await request(appServer()).get('/auth/check-login');
    expect(res.status).toBe(401);
  });

  it('expired / malformed / tampered / wrong-secret tokens are all rejected', async () => {
    const user = await createUser();

    const expired = jwt.sign(
      { userId: user.id },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '-10s' },
    );
    expect((await checkLoginReq(expired)).status).toBe(401);

    expect((await checkLoginReq('abc.def.ghi')).status).toBe(401);

    const [header, payloadPart, signature] = tokenFor(user.id).split('.');
    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString(),
    ) as { userId: number };
    payload.userId = 999999;
    const tampered = `${header}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;
    expect((await checkLoginReq(tampered)).status).toBe(401);

    const wrongSecret = jwt.sign(
      { userId: user.id },
      { secret: 'definitely-not-the-server-secret' },
    );
    expect((await checkLoginReq(wrongSecret)).status).toBe(401);
  });

  it('missing ACCESS_TOKEN_SECRET fails closed (verify 401, sign throws)', async () => {
    const user = await createUser();
    const valid = tokenFor(user.id);
    const tokens = app.get(TokensService);
    const saved = process.env.ACCESS_TOKEN_SECRET;
    try {
      Reflect.deleteProperty(process.env, 'ACCESS_TOKEN_SECRET');
      expect((await checkLoginReq(valid)).status).toBe(401);
      expect(() => tokens.createAccessToken({ userId: user.id })).toThrow();
    } finally {
      process.env.ACCESS_TOKEN_SECRET = saved;
    }
    // secret restored → the same token verifies again
    expect((await checkLoginReq(valid)).status).toBe(200);
  });

  it('access tokens carry the configured short TTL (default 15m)', async () => {
    const login = await loginSession();
    const decoded = jwt.decode<{ iat: number; exp: number }>(login.accessToken);
    expect(decoded).toBeTruthy();
    const rawTtl = process.env.ACCESS_TOKEN_TTL;
    const minutes = /^(\d+)m$/.exec(rawTtl ?? '');
    const seconds = /^(\d+)s$/.exec(rawTtl ?? '');
    const expectedTtl = minutes
      ? Number(minutes[1]) * 60
      : seconds
        ? Number(seconds[1])
        : 900;
    expect(decoded.exp - decoded.iat).toBe(expectedTtl);
    expect(expectedTtl).toBeLessThanOrEqual(900); // never a long-lived token
  });

  // ================================================ OTP login → session

  it('OTP login: {message, accessToken} only + HttpOnly refresh cookie + hashed session row', async () => {
    const user = await createUser();
    const existence = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });
    const verify = await checkOtp(
      lastDelivery().code,
      cookieFrom(existence, 'otp'),
    );
    expect(verify.status).toBe(201);

    // Established response contract — and NO refresh token in the body.
    expect(Object.keys(bodyOf(verify)).sort()).toEqual([
      'accessToken',
      'message',
    ]);
    expect(typeof bodyOf(verify).accessToken).toBe('string');

    const pair = cookieFrom(verify, 'refresh_token');
    const raw = rawOf(pair);
    const attrs = cookieAttrs(setCookieOf(verify, 'refresh_token'));
    expect(attrs[0]).toMatch(/^refresh_token=/);
    expect(attrs).toContain('httponly');
    expect(attrs).toContain('samesite=lax');
    expect(attrs.some((a) => a.startsWith('path=/api/auth'))).toBe(true);
    expect(attrs.some((a) => a.startsWith('max-age='))).toBe(true);
    expect(attrs).not.toContain('secure'); // NODE_ENV is not production here

    // The DB stores only a strong one-way hash — never the raw token.
    const row = await sessionRowByHash(sha(raw));
    expect(row).toBeTruthy();
    expect(row?.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(raw);
    expect(row?.userId).toBe(user.id);
    expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(row?.revokedAt).toBeNull();
    // ...and the raw refresh token never appears in any response body.
    expect(JSON.stringify(bodyOf(verify))).not.toContain(raw);
  });

  // ==================================================== refresh endpoint

  it('valid refresh: new access token, rotated cookie, same family, old row revoked', async () => {
    const login = await loginSession();
    const res = await refreshReq(login.refreshCookie);
    expect(res.status).toBe(201);

    // Refresh token never appears in the JSON body.
    expect(Object.keys(bodyOf(res)).sort()).toEqual(['accessToken']);
    expect(JSON.stringify(bodyOf(res))).not.toContain(login.rawRefresh);

    const nextAccessToken = String(bodyOf(res).accessToken);
    const nextCookie = cookieFrom(res, 'refresh_token');
    const nextRaw = rawOf(nextCookie);
    expect(nextRaw).not.toBe(login.rawRefresh); // rotated value

    // The new access token is a working session credential.
    expect((await checkLoginReq(nextAccessToken)).status).toBe(200);

    // Rotation keeps the family and revokes the old row.
    const oldRow = await sessionRowByHash(sha(login.rawRefresh));
    const newRow = await sessionRowByHash(sha(nextRaw));
    expect(oldRow?.revokedAt).toBeTruthy();
    expect(newRow?.familyId).toBe(oldRow?.familyId);
    expect(newRow?.revokedAt).toBeNull();

    // Refresh requires no access token at all (none was sent above).
    expect(res.headers['authorization']).toBeUndefined();
  });

  it('missing refresh cookie → 401', async () => {
    expect((await refreshReq()).status).toBe(401);
  });

  it('garbage refresh cookie → 401 with the cookie cleared', async () => {
    const res = await refreshReq('refresh_token=not-a-real-token');
    expect(res.status).toBe(401);
    const attrs = cookieAttrs(setCookieOf(res, 'refresh_token'));
    expect(attrs.some((a) => a.startsWith('expires=thu, 01 jan 1970'))).toBe(
      true,
    );
    expect(attrs).toContain('httponly');
  });

  it('expired refresh session → 401', async () => {
    const login = await loginSession();
    await sessions().update(
      { refreshTokenHash: sha(login.rawRefresh) },
      { expiresAt: new Date(Date.now() - 1000) },
    );
    expect((await refreshReq(login.refreshCookie)).status).toBe(401);
  });

  it('reuse detection: presenting a rotated token revokes the ENTIRE family', async () => {
    const login = await loginSession();

    const first = await refreshReq(login.refreshCookie);
    expect(first.status).toBe(201);
    const survivor = cookieFrom(first, 'refresh_token');

    // The old (already rotated) token is a theft signal.
    const reuse = await refreshReq(login.refreshCookie);
    expect(reuse.status).toBe(401);

    // The family revocation also killed the legitimate successor.
    expect((await refreshReq(survivor)).status).toBe(401);
    const rows = await sessions().findBy({
      familyId: (await sessionRowByHash(sha(login.rawRefresh)))!.familyId,
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.revokedAt).toBeTruthy();
  });

  it('blocked user: refresh → 403, family revoked, no token ever issued', async () => {
    const login = await loginSession();
    await users().update({ id: login.userId }, { status: UserStatus.Block });

    const blocked = await refreshReq(login.refreshCookie);
    expect(blocked.status).toBe(403);
    expect(bodyOf(blocked)).not.toHaveProperty('accessToken');
    const attrs = cookieAttrs(setCookieOf(blocked, 'refresh_token'));
    expect(attrs.some((a) => a.startsWith('expires=thu, 01 jan 1970'))).toBe(
      true,
    );

    // Even after an unblock the revoked family stays dead.
    await users().update({ id: login.userId }, { status: UserStatus.Active });
    expect((await refreshReq(login.refreshCookie)).status).toBe(401);
  });

  it('deleted user: sessions cascade away and refresh fails', async () => {
    const login = await loginSession();
    expect(await sessions().count({ where: { userId: login.userId } })).toBe(1);

    const del = await request(appServer())
      .delete('/user/account')
      .set('Authorization', `Bearer ${tokenFor(login.userId)}`)
      .send({ username: login.username });
    expect(del.status).toBeLessThan(400);

    expect(await sessions().count({ where: { userId: login.userId } })).toBe(0);
    expect((await refreshReq(login.refreshCookie)).status).toBe(401);
    const idx = fixtureUserIds.indexOf(login.userId);
    if (idx >= 0) fixtureUserIds.splice(idx, 1);
  });

  it('concurrent refreshes with one cookie: exactly one wins', async () => {
    const login = await loginSession();
    const [a, b] = await Promise.all([
      refreshReq(login.refreshCookie),
      refreshReq(login.refreshCookie),
    ]);
    const statuses = [a.status, b.status];
    expect(statuses.filter((s) => s < 400)).toHaveLength(1);
    expect(statuses.filter((s) => s === 401)).toHaveLength(1);
  });

  // ===================================================== logout endpoint

  it('logout revokes the session, clears the cookie, refresh then fails', async () => {
    const login = await loginSession();
    const out = await logoutReq(login.refreshCookie);
    expect(out.status).toBe(201);
    expect(Object.keys(bodyOf(out))).toEqual(['message']);

    const attrs = cookieAttrs(setCookieOf(out, 'refresh_token'));
    expect(attrs.some((a) => a.startsWith('expires=thu, 01 jan 1970'))).toBe(
      true,
    );
    expect(attrs).toContain('httponly');

    expect((await refreshReq(login.refreshCookie)).status).toBe(401);
  });

  it('logout is idempotent (no cookie / garbage cookie still succeed)', async () => {
    expect((await logoutReq()).status).toBe(201);
    expect((await logoutReq('refresh_token=who-knows')).status).toBe(201);
  });

  it('logout only ever touches its own session', async () => {
    const a = await loginSession();
    const b = await loginSession();
    expect((await logoutReq(a.refreshCookie)).status).toBe(201);
    expect((await refreshReq(b.refreshCookie)).status).toBe(201);
  });

  // ====================================================== Google OAuth

  it('OAuth redirect carries a one-time code — never a token — and it exchanges for a session', async () => {
    const email = `${unique('gauth')}@r05.test`;
    const location = await googleHandoff(email);

    expect(location).toContain('/auth/google/callback?code=');
    expect(location).not.toContain('token=');
    expect(location).not.toMatch(/eyJ[A-Za-z0-9_-]/); // no JWT anywhere in the URL

    const code = new URL(location).searchParams.get('code');
    expect(code).toBeTruthy();
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/); // opaque 256-bit random

    const res = await exchangeReq(code!);
    expect(res.status).toBe(201);
    expect(Object.keys(bodyOf(res)).sort()).toEqual(['accessToken', 'message']);
    expect((await checkLoginReq(String(bodyOf(res).accessToken))).status).toBe(
      200,
    );
    const attrs = cookieAttrs(setCookieOf(res, 'refresh_token'));
    expect(attrs).toContain('httponly');

    // The user was created/verified exactly as before.
    const user = await users().findOneBy({ email });
    expect(user).toBeTruthy();
    if (user) {
      expect(user.verify_email).toBe(true);
      fixtureUserIds.push(user.id);
    }

    // The code is single-use: spending it again is a 401.
    expect((await exchangeReq(code!)).status).toBe(401);
  });

  it('expired handoff code → 401', async () => {
    const user = await createUser();
    const code = await insertHandoffCode(user.id, -1000);
    expect((await exchangeReq(code)).status).toBe(401);
  });

  it('blocked user cannot exchange a handoff code (403, no session)', async () => {
    const user = await createUser({ status: UserStatus.Block });
    const code = await insertHandoffCode(user.id);
    const res = await exchangeReq(code);
    expect(res.status).toBe(403);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('exchange DTO is strict: unknown properties are rejected with 400', async () => {
    const res = await exchangeReq('x'.repeat(43), { unexpected: true });
    expect(res.status).toBe(400);
  });

  // ==================================================== SameOriginGuard

  it('cookie endpoints reject a foreign Origin (403) but accept the app origin', async () => {
    const evil = await refreshReq(
      'refresh_token=anything',
      'https://evil.example',
    );
    expect(evil.status).toBe(403);
    expect(evil.headers['set-cookie']).toBeUndefined(); // rejected before touching the cookie

    const own = await refreshReq(
      'refresh_token=anything',
      'http://localhost:3001',
    );
    expect(own.status).toBe(401); // guard passed → handler rejected the unknown cookie

    const logoutEvil = request(appServer())
      .post('/auth/logout')
      .set('Origin', 'https://evil.example');
    expect((await logoutEvil).status).toBe(403);
  });
});
