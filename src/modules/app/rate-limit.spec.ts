/**
 * R-04 global rate limiting — integration tests against a REAL PostgreSQL
 * schema, exercising the SAME ThrottlerGuard configuration that ships in
 * production (in-memory store, IP tracker, per-route+IP buckets).
 *
 * Covered:
 *  - a normal frontend page-load burst is never throttled;
 *  - the request past the configured limit gets a sanitized Persian 429 with
 *    standard rate-limit headers (Retry-After, X-RateLimit-*), no stack/SQL;
 *  - the block persists for the window and then recovers automatically;
 *  - authenticated routes share the same per-route bucket;
 *  - the OTP request limiter (3 / 10 min, DB-backed) stays independent —
 *    its 429 carries its own message, not the global one;
 *  - the documented defaults are what an unset environment falls back to.
 *
 * The window is env-driven (RATE_LIMIT_TTL_MS / RATE_LIMIT_MAX) so the tests
 * stay deterministic — the limiter is made small, never disabled.
 */
import { INestApplication } from '@nestjs/common';
import { createAppValidationPipe } from 'src/common/pipes/app-validation.pipe';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Client } from 'pg';
import { config } from 'dotenv';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { UserEntity } from '../user/entities/user.entity';
import { OtpEntity } from '../user/entities/otp.entity';
import { Roles } from 'src/common/enums/role.eunm';
import { UserStatus } from '../user/enums/status.enum';
import { RateLimitMessage } from 'src/common/enums/message.enum';
import {
  RATE_LIMIT_DEFAULT_MAX,
  RATE_LIMIT_DEFAULT_TTL_MS,
  readPositiveInt,
} from 'src/common/config/rate-limit.config';
import { OtpDeliveryService } from '../otp-delivery/otp-delivery.service';
import type { AppModule as AppModuleType } from './app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_rate_limit_test';

// Small real window: every phase below runs a handful of requests, so the
// burst tests complete far inside the TTL even under parallel jest load,
// while the recovery sleep stays comfortably above it (TTL == block duration).
const WINDOW_TTL_MS = 15000;
const WINDOW_LIMIT = 10;
const RECOVERY_GAP_MS = 17000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Global rate limiting (R-04)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const jwt = new JwtService();
  const fixtureUserIds: number[] = [];
  let seq = 0;

  // Recording replacement for OtpDeliveryService — proves the OTP flow ran.
  const deliveryMock = {
    send: jest.fn(() => Promise.resolve()),
  };

  const unique = (prefix: string) =>
    `${prefix}_${Date.now()}_${++seq}_${Math.random().toString(36).slice(2, 7)}`;

  const tokenFor = (userId: number) =>
    jwt.sign(
      { userId },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1y' },
    );

  const appServer = (): Server => app.getHttpServer() as Server;

  const feed = (query = '') => request(appServer()).get(`/blog${query}`);

  const checkLogin = (userId: number) =>
    request(appServer())
      .get('/auth/check-login')
      .set('Authorization', `Bearer ${tokenFor(userId)}`);

  const userExistence = (username: string) =>
    request(appServer())
      .post('/auth/user-existence')
      .send({ method: 'email', type: 'login', username });

  /** supertest's `res.body` is `any` — narrow it before reading fields. */
  const bodyOf = (res: request.Response): Record<string, unknown> =>
    res.body as Record<string, unknown>;

  const users = () => ds.getRepository(UserEntity);
  const otps = () => ds.getRepository(OtpEntity);

  const createUser = async (opts: { email?: string } = {}) => {
    const username = unique('rluser');
    const email = opts.email ?? `${username}@rl.test`;
    const result = await users().insert({
      username,
      email,
      role: Roles.User,
      status: UserStatus.Active,
      verify_email: true,
    });
    const id = Number(result.identifiers[0].id);
    fixtureUserIds.push(id);
    return { id, email };
  };

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads —
    // TypeOrmConfig() reads process.env at module import time.
    process.env.DB_NAME = TEST_DB;
    // R-04: a small but REAL window — the limiter stays active; only the
    // numbers shrink so every phase is deterministic.
    process.env.RATE_LIMIT_TTL_MS = String(WINDOW_TTL_MS);
    process.env.RATE_LIMIT_MAX = String(WINDOW_LIMIT);
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
    const { AppModule } = require('./app.module') as {
      AppModule: typeof AppModuleType;
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OtpDeliveryService)
      .useValue(deliveryMock)
      .compile();

    app = moduleRef.createNestApplication();
    // main.ts registers cookie-parser and the strict pipe — mirror both.
    app.use(cookieParser());
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      for (const id of fixtureUserIds) {
        try {
          await users().delete({ id });
          await otps().delete({ userId: id });
        } catch {
          // best effort — the rows may already be gone
        }
      }
      await app.close();
    }
    deliveryMock.send.mockRestore();
  });

  it('lets a normal page-load burst through without throttling', async () => {
    // The realistic frontend pattern: feed + filters + pagination, all on the
    // same route (buckets are per-route+IP) — must stay well under the limit.
    const queries = [
      '',
      '?page=1',
      '?limit=5',
      '?page=2&limit=5',
      '?category=foo',
      '?search=bar',
      '?category=foo&page=1',
      '?search=bar&limit=10',
    ];
    for (const query of queries) {
      const res = await feed(query);
      expect(res.status).toBe(200);
      // Headers prove the ENV override reached the running guard.
      expect(res.headers['x-ratelimit-limit']).toBe(String(WINDOW_LIMIT));
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    }
  });

  it('answers the request past the limit with a sanitized 429', async () => {
    // 8 hits already consumed in the previous test → #9 and #10 pass …
    const ninth = await feed();
    expect(ninth.status).toBe(200);
    expect(ninth.headers['x-ratelimit-remaining']).toBe('1');

    const tenth = await feed();
    expect(tenth.status).toBe(200);
    expect(tenth.headers['x-ratelimit-remaining']).toBe('0');

    // … #11 exceeds the limit.
    const blocked = await feed();
    expect(blocked.status).toBe(429);

    const body = bodyOf(blocked);
    // The base exception filter renders a string-message HttpException as
    // { statusCode, message } — nothing else may leak.
    expect(Object.keys(body).sort()).toEqual(['message', 'statusCode']);
    expect(body.statusCode).toBe(429);
    expect(body.message).toBe(RateLimitMessage.TooManyRequests);
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/SELECT|node_modules|at Object\./);

    const retryAfter = Number(blocked.headers['retry-after']);
    expect(Number.isFinite(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });

  it('keeps the block active until the window resets', async () => {
    const stillBlocked = await feed();
    expect(stillBlocked.status).toBe(429);
    expect(bodyOf(stillBlocked).message).toBe(RateLimitMessage.TooManyRequests);
  });

  it('recovers automatically once the block window expires', async () => {
    // blockDuration defaults to ttl — wait it out, no manual intervention.
    await sleep(RECOVERY_GAP_MS);
    const recovered = await feed();
    expect(recovered.status).toBe(200);
    expect(recovered.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('applies the same limit to authenticated routes', async () => {
    const { id } = await createUser();
    // Fresh bucket (different route) — 10 pass, the 11th is throttled.
    for (let i = 0; i < WINDOW_LIMIT; i++) {
      const res = await checkLogin(id);
      expect(res.status).toBe(200);
    }
    const blocked = await checkLogin(id);
    expect(blocked.status).toBe(429);
    expect(bodyOf(blocked).message).toBe(RateLimitMessage.TooManyRequests);
  });

  it('keeps the OTP request limiter independent from the global one', async () => {
    const user = await createUser();
    deliveryMock.send.mockClear();

    // First three OTP requests are allowed by the DB-backed OTP limiter
    // (max 3 / 10 min) and stay inside the global window too.
    for (let i = 0; i < 3; i++) {
      const res = await userExistence(user.email);
      expect(res.status).not.toBe(429);
    }
    expect(deliveryMock.send).toHaveBeenCalledTimes(3);

    // The fourth is refused by the OTP limiter — its own message, not the
    // global throttle message, and long before the global window (4 < 10).
    const otpBlocked = await userExistence(user.email);
    expect(otpBlocked.status).toBe(429);
    expect(bodyOf(otpBlocked).message).toBe(
      RateLimitMessage.TooManyOtpRequests,
    );
    expect(bodyOf(otpBlocked).message).not.toBe(
      RateLimitMessage.TooManyRequests,
    );
    expect(deliveryMock.send).toHaveBeenCalledTimes(3);
  });

  it('exposes the documented defaults and safe env parsing', () => {
    // What an unset/invalid environment falls back to.
    expect(RATE_LIMIT_DEFAULT_TTL_MS).toBe(60000);
    expect(RATE_LIMIT_DEFAULT_MAX).toBeGreaterThanOrEqual(50);
    expect(readPositiveInt(undefined, RATE_LIMIT_DEFAULT_MAX)).toBe(
      RATE_LIMIT_DEFAULT_MAX,
    );
    expect(readPositiveInt('250', RATE_LIMIT_DEFAULT_MAX)).toBe(250);
    expect(readPositiveInt('not-a-number', RATE_LIMIT_DEFAULT_MAX)).toBe(
      RATE_LIMIT_DEFAULT_MAX,
    );
    expect(readPositiveInt('-5', RATE_LIMIT_DEFAULT_MAX)).toBe(
      RATE_LIMIT_DEFAULT_MAX,
    );
    expect(readPositiveInt('0', RATE_LIMIT_DEFAULT_MAX)).toBe(
      RATE_LIMIT_DEFAULT_MAX,
    );
  });
});
