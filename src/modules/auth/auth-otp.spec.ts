/**
 * OTP authentication — integration tests against a REAL PostgreSQL schema.
 *
 * Covers the R-01 + R-14 contract:
 * - the OTP code never appears in an HTTP response (login, register,
 *   change-email, change-phone),
 * - the delivery provider receives the correct code for the right channel
 *   and destination (including the NEW address for change flows),
 * - B4 verification security is preserved and hardened: wrong code, expiry,
 *   consumption/replay, failed-attempt limit, request rate limit,
 * - change-email / change-phone are verified as a separate step against the
 *   cookie-scoped OTP,
 * - no application code logs an OTP secret.
 *
 * The suite boots the Nest app against a dedicated test database
 * (virgool_auth_otp_test, created automatically) so the development database
 * is never touched. Delivery is replaced with a recording stub — the real
 * transports are unit-tested in otp-delivery.service.spec.ts.
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
import { ProfileEntity } from '../user/entities/profile.entity';
import { OtpEntity } from '../user/entities/otp.entity';
import { Roles } from 'src/common/enums/role.eunm';
import { UserStatus } from '../user/enums/status.enum';
import { AuthMessage, RateLimitMessage } from 'src/common/enums/message.enum';
import { OtpDeliveryService } from '../otp-delivery/otp-delivery.service';
import type { OtpDeliveryMessage } from '../otp-delivery/otp-delivery.types';
import type { AppModule as AppModuleType } from '../app/app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_auth_otp_test';

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

describe('OTP authentication (R-01 delivery + R-14 verification security)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const jwt = new JwtService();
  const fixtureUserIds: number[] = [];
  let seq = 0;

  // Recording replacement for OtpDeliveryService — captures every code that
  // would have been sent out-of-band.
  const delivered: OtpDeliveryMessage[] = [];
  const deliveryMock = {
    send: jest.fn((message: OtpDeliveryMessage) => {
      delivered.push(message);
      return Promise.resolve();
    }),
  };

  // Global console spies: prove that no application path prints a secret.
  const consoleSpies = (
    ['log', 'info', 'warn', 'error', 'debug'] as ConsoleMethod[]
  ).map((method) =>
    jest.spyOn(console, method).mockImplementation(() => undefined),
  );

  const unique = (prefix: string) =>
    `${prefix}_${Date.now()}_${++seq}_${Math.random().toString(36).slice(2, 7)}`;

  const tokenFor = (userId: number) =>
    jwt.sign(
      { userId },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1y' },
    );

  const auth = (userId: number) => `Bearer ${tokenFor(userId)}`;

  const appServer = (): Server => app.getHttpServer() as Server;

  const userExistence = (payload: {
    method: string;
    type: string;
    username: string;
  }) => request(appServer()).post('/auth/user-existence').send(payload);

  const checkOtp = (code: string, cookie?: string) => {
    const req = request(appServer()).post('/auth/check-otp').send({ code });
    return cookie ? req.set('Cookie', cookie) : req;
  };

  const changeEmailReq = (userId: number, email: string) =>
    request(appServer())
      .patch('/user/change-email')
      .set('Authorization', auth(userId))
      .send({ email });

  const changePhoneReq = (userId: number, phone: string) =>
    request(appServer())
      .patch('/user/change-phone')
      .set('Authorization', auth(userId))
      .send({ phone });

  const verifyEmailReq = (userId: number, code: string, cookie: string) =>
    request(appServer())
      .post('/user/verify-email-otp')
      .set('Authorization', auth(userId))
      .set('Cookie', cookie)
      .send({ code });

  const verifyPhoneReq = (userId: number, code: string, cookie: string) =>
    request(appServer())
      .post('/user/verify-phone-otp')
      .set('Authorization', auth(userId))
      .set('Cookie', cookie)
      .send({ code });

  /** Extracts a `name=value` cookie pair from a response (for the Cookie header). */
  const cookieFrom = (res: request.Response, name: string): string => {
    const setCookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
    const found = setCookies.find((c) => c.startsWith(`${name}=`));
    if (!found) throw new Error(`cookie ${name} missing in response`);
    return found.split(';')[0];
  };

  const lastDelivery = (): OtpDeliveryMessage => {
    const message = delivered[delivered.length - 1];
    if (!message) throw new Error('nothing was delivered');
    return message;
  };

  /** supertest's `res.body` is `any` — narrow it before reading fields. */
  const bodyOf = (res: request.Response): Record<string, unknown> =>
    res.body as Record<string, unknown>;

  // ------------------------------------------------------------- repositories

  const users = () => ds.getRepository(UserEntity);
  const profiles = () => ds.getRepository(ProfileEntity);
  const otps = () => ds.getRepository(OtpEntity);

  // ---------------------------------------------------------------- fixtures

  const createUser = async (opts: { email?: string; phone?: string } = {}) => {
    const username = unique('otpreg');
    const email = opts.email ?? `${username}@otpreg.test`;
    const phone = opts.phone ?? `0912${String(9000000 + seq)}`;
    const result = await users().insert({
      username,
      email,
      phone,
      role: Roles.User,
      status: UserStatus.Active,
      verify_email: true,
    });
    const id = Number(result.identifiers[0].id);
    fixtureUserIds.push(id);
    return { id, username, email, phone };
  };

  /** Tracks a user created through the register API for cleanup. */
  const trackByEmail = async (email: string) => {
    const user = await users().findOneBy({ email });
    if (user) fixtureUserIds.push(user.id);
    return user;
  };

  const otpRowOf = (userId: number) => otps().findOneBy({ userId });

  // ------------------------------------------------------------- test hooks

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads —
    // TypeOrmConfig() reads process.env at module import time.
    process.env.DB_NAME = TEST_DB;
    // R-04: keep the global limiter ACTIVE but deterministic for this suite —
    // a generous window so its request volume never trips the 429s below.
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
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OtpDeliveryService)
      .useValue(deliveryMock)
      .compile();

    app = moduleRef.createNestApplication();
    // main.ts registers cookie-parser — the OTP flows read scoped cookies.
    app.use(cookieParser());
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      // Remove every fixture this suite created — only fixture ids are ever
      // touched (users first, then their profile/otp rows).
      for (const id of fixtureUserIds) {
        try {
          await users().delete({ id });
          await profiles().delete({ userId: id });
          await otps().delete({ userId: id });
        } catch {
          // best effort — the rows may already be gone
        }
      }
      await app.close();
    }
    for (const spy of consoleSpies) spy.mockRestore();
  });

  // Regression: no console output anywhere in the suite may contain any OTP
  // code that was handed to delivery (delivery itself is mocked out).
  afterEach(() => {
    const logged = consoleSpies
      .flatMap((spy) => spy.mock.calls)
      .map((call) => call.map((arg) => String(arg)).join(' '))
      .join('\n');
    for (const message of delivered) {
      if (message.code) expect(logged).not.toContain(message.code);
    }
  });

  // ---------------------------------------- responses never contain the code

  it('login: response has no OTP; delivery receives the correct code (email)', async () => {
    const user = await createUser();

    const res = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });

    // POST endpoints default to 201 (Nest) — pre-existing API behavior.
    expect(res.status).toBe(201);
    const body = res.body as Record<string, unknown>;
    expect(typeof body.message).toBe('string');
    expect(body.code).toBeUndefined();

    const delivery = lastDelivery();
    expect(delivery).toMatchObject({ channel: 'email', to: user.email });
    expect(JSON.stringify(body)).not.toContain(delivery.code);

    // The delivered code is the one stored for this user — and it works.
    const otp = await otpRowOf(user.id);
    expect(otp?.code).toBe(delivery.code);

    const verify = await checkOtp(delivery.code, cookieFrom(res, 'otp'));
    expect(verify.status).toBe(201);
    expect(typeof bodyOf(verify).accessToken).toBe('string');
  });

  it('register: response has no OTP; new account verifies with the delivered code', async () => {
    const email = `${unique('otpregreg')}@otpreg.test`;

    const res = await userExistence({
      method: 'email',
      type: 'register',
      username: email,
    });

    expect(res.status).toBe(201);
    expect((res.body as Record<string, unknown>).code).toBeUndefined();

    const delivery = lastDelivery();
    expect(delivery).toMatchObject({ channel: 'email', to: email });
    expect(JSON.stringify(res.body)).not.toContain(delivery.code);

    const user = await trackByEmail(email);
    expect(user).not.toBeNull();
    const otp = await otpRowOf(user!.id);
    expect(otp?.code).toBe(delivery.code);

    const verify = await checkOtp(delivery.code, cookieFrom(res, 'otp'));
    expect(verify.status).toBe(201);
    expect(typeof bodyOf(verify).accessToken).toBe('string');
  });

  it('login by phone: response has no OTP; SMS channel used with the phone number', async () => {
    const user = await createUser();

    const res = await userExistence({
      method: 'phone',
      type: 'login',
      username: user.phone,
    });

    expect(res.status).toBe(201);
    expect((res.body as Record<string, unknown>).code).toBeUndefined();

    const delivery = lastDelivery();
    expect(delivery).toMatchObject({ channel: 'sms', to: user.phone });
    const otp = await otpRowOf(user.id);
    expect(otp?.code).toBe(delivery.code);
  });

  it('login by username falls back to the account contact data', async () => {
    const user = await createUser();

    const res = await userExistence({
      method: 'username',
      type: 'login',
      username: user.username,
    });

    expect(res.status).toBe(201);
    expect((res.body as Record<string, unknown>).code).toBeUndefined();

    const delivery = lastDelivery();
    // phone first, then email — the account has a phone.
    expect(delivery).toMatchObject({ channel: 'sms', to: user.phone });
  });

  // ------------------------------------------------- verification security

  it('a wrong OTP is rejected', async () => {
    const user = await createUser();
    const res = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });

    const verify = await checkOtp('00000', cookieFrom(res, 'otp'));

    expect(verify.status).toBe(401);
    expect(bodyOf(verify).message).toBe(AuthMessage.TryAgain);
  });

  it('an expired OTP is rejected', async () => {
    const user = await createUser();
    const res = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });
    await otps().update(
      { userId: user.id },
      { expiresIn: new Date(Date.now() - 1000) },
    );

    const verify = await checkOtp(lastDelivery().code, cookieFrom(res, 'otp'));

    expect(verify.status).toBe(401);
    expect(bodyOf(verify).message).toBe(AuthMessage.ExiredCode);
  });

  it('a consumed OTP cannot be replayed', async () => {
    const user = await createUser();
    const res = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });
    const cookie = cookieFrom(res, 'otp');
    const code = lastDelivery().code;

    const first = await checkOtp(code, cookie);
    expect(first.status).toBe(201);

    const replay = await checkOtp(code, cookie);
    expect(replay.status).toBe(401);
    expect(bodyOf(replay).message).toBe(AuthMessage.ExiredCode);
  });

  it('five wrong attempts invalidate the code — even the right one fails after', async () => {
    const user = await createUser();
    const res = await userExistence({
      method: 'email',
      type: 'login',
      username: user.email,
    });
    const cookie = cookieFrom(res, 'otp');
    const code = lastDelivery().code;

    for (let attempt = 1; attempt <= 4; attempt++) {
      const wrong = await checkOtp('00001', cookie);
      expect(wrong.status).toBe(401);
      expect(bodyOf(wrong).message).toBe(AuthMessage.TryAgain);
    }

    const limit = await checkOtp('00002', cookie);
    expect(limit.status).toBe(401);
    expect(bodyOf(limit).message).toBe(RateLimitMessage.TooManyAttempts);

    const afterLimit = await checkOtp(code, cookie);
    expect(afterLimit.status).toBe(401);
  });

  it('OTP requests are rate limited (max 3 per 10 minutes)', async () => {
    const user = await createUser();
    const payload = { method: 'email', type: 'login', username: user.email };
    const before = delivered.length;

    for (let i = 0; i < 3; i++) {
      const res = await userExistence(payload);
      expect(res.status).toBe(201);
    }
    expect(delivered.length).toBe(before + 3);

    const fourth = await userExistence(payload);
    expect(fourth.status).toBe(429);
    expect(delivered.length).toBe(before + 3);
  });

  // --------------------------------------------------------- change-email

  it('change-email: returns otpRequired (never the code) and delivers to the NEW email', async () => {
    const user = await createUser();
    const newEmail = `${unique('newmail')}@otpreg.test`;
    const before = delivered.length;

    const res = await changeEmailReq(user.id, newEmail);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ otpRequired: true });
    expect(bodyOf(res).code).toBeUndefined();
    expect(delivered.length).toBe(before + 1);

    const delivery = lastDelivery();
    expect(delivery).toMatchObject({ channel: 'email', to: newEmail });
    expect(JSON.stringify(res.body)).not.toContain(delivery.code);

    const otp = await otpRowOf(user.id);
    expect(otp?.code).toBe(delivery.code);
    expect(cookieFrom(res, 'email-otp')).toMatch(/^email-otp=/);
  });

  it('change-email: verifies with the delivered code and updates the address', async () => {
    const user = await createUser();
    const newEmail = `${unique('newmail')}@otpreg.test`;
    const res = await changeEmailReq(user.id, newEmail);
    const cookie = cookieFrom(res, 'email-otp');
    const code = lastDelivery().code;

    const verify = await verifyEmailReq(user.id, code, cookie);
    expect(verify.status).toBe(201);

    const refreshed = await users().findOneBy({ id: user.id });
    expect(refreshed?.email).toBe(newEmail);
    expect(refreshed?.new_email).toBeNull();

    // The consumed code cannot be used again.
    const replay = await verifyEmailReq(user.id, code, cookie);
    expect(replay.status).toBe(400);
  });

  it('change-email: a wrong code is rejected', async () => {
    const user = await createUser();
    const res = await changeEmailReq(
      user.id,
      `${unique('newmail')}@otpreg.test`,
    );

    const verify = await verifyEmailReq(
      user.id,
      '00000',
      cookieFrom(res, 'email-otp'),
    );

    expect(verify.status).toBe(400);
    expect(bodyOf(verify).message).toBe(AuthMessage.TryAgain);
  });

  it('change-email: five wrong attempts invalidate the code', async () => {
    const user = await createUser();
    const res = await changeEmailReq(
      user.id,
      `${unique('newmail')}@otpreg.test`,
    );
    const cookie = cookieFrom(res, 'email-otp');
    const code = lastDelivery().code;

    for (let attempt = 1; attempt <= 4; attempt++) {
      const wrong = await verifyEmailReq(user.id, '00001', cookie);
      expect(wrong.status).toBe(400);
      expect(bodyOf(wrong).message).toBe(AuthMessage.TryAgain);
    }

    const limit = await verifyEmailReq(user.id, '00002', cookie);
    expect(limit.status).toBe(400);
    expect(bodyOf(limit).message).toBe(RateLimitMessage.TooManyAttempts);

    const afterLimit = await verifyEmailReq(user.id, code, cookie);
    expect(afterLimit.status).toBe(400);
  });

  it('change-email: OTP requests are rate limited (max 3 per 10 minutes)', async () => {
    const user = await createUser();
    const before = delivered.length;

    for (let i = 0; i < 3; i++) {
      const res = await changeEmailReq(
        user.id,
        `${unique('newmail')}@otpreg.test`,
      );
      expect(res.status).toBe(200);
      expect(bodyOf(res).otpRequired).toBe(true);
    }
    expect(delivered.length).toBe(before + 3);

    const fourth = await changeEmailReq(
      user.id,
      `${unique('newmail')}@otpreg.test`,
    );
    expect(fourth.status).toBe(429);
  });

  it('change-email: your own address is a no-op without delivery', async () => {
    const user = await createUser();
    const before = delivered.length;

    const res = await changeEmailReq(user.id, user.email);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ otpRequired: false });
    expect(bodyOf(res).code).toBeUndefined();
    expect(delivered.length).toBe(before);
  });

  it('change-email: requires authentication', async () => {
    const res = await request(appServer())
      .patch('/user/change-email')
      .send({ email: `${unique('guest')}@otpreg.test` });

    expect(res.status).toBe(401);
  });

  // --------------------------------------------------------- change-phone

  it('change-phone: returns otpRequired (never the code) and delivers SMS to the NEW number', async () => {
    const user = await createUser();
    const newPhone = `0912${String(8000000 + seq)}`;
    const before = delivered.length;

    const res = await changePhoneReq(user.id, newPhone);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ otpRequired: true });
    expect(bodyOf(res).code).toBeUndefined();
    expect(delivered.length).toBe(before + 1);

    const delivery = lastDelivery();
    expect(delivery).toMatchObject({ channel: 'sms', to: newPhone });
    expect(JSON.stringify(res.body)).not.toContain(delivery.code);

    const otp = await otpRowOf(user.id);
    expect(otp?.code).toBe(delivery.code);
    expect(cookieFrom(res, 'phone-otp')).toMatch(/^phone-otp=/);
  });

  it('change-phone: verifies with the delivered code, updates the number, blocks replay', async () => {
    const user = await createUser();
    const newPhone = `0912${String(7000000 + seq)}`;
    const res = await changePhoneReq(user.id, newPhone);
    const cookie = cookieFrom(res, 'phone-otp');
    const code = lastDelivery().code;

    const verify = await verifyPhoneReq(user.id, code, cookie);
    expect(verify.status).toBe(201);

    const refreshed = await users().findOneBy({ id: user.id });
    expect(refreshed?.phone).toBe(newPhone);
    expect(refreshed?.new_Phone).toBeNull();

    const replay = await verifyPhoneReq(user.id, code, cookie);
    expect(replay.status).toBe(400);
  });

  it('change-phone: a wrong code is rejected', async () => {
    const user = await createUser();
    const res = await changePhoneReq(user.id, `0912${String(6000000 + seq)}`);

    const verify = await verifyPhoneReq(
      user.id,
      '00000',
      cookieFrom(res, 'phone-otp'),
    );

    expect(verify.status).toBe(400);
    expect(bodyOf(verify).message).toBe(AuthMessage.TryAgain);
  });

  it('change-phone: requires authentication', async () => {
    const res = await request(appServer())
      .patch('/user/change-phone')
      .send({ phone: `0912${String(5000000 + seq)}` });

    expect(res.status).toBe(401);
  });
});
