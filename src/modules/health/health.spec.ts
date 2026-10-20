/**
 * Health probes + HTTP security headers + error hygiene.
 *
 * Boots the Nest app against a dedicated test database
 * (virgool_health_test, created automatically) so the development database
 * is never touched, and applies the same security-header configuration as
 * production (`applySecurityHeaders`, shared with `main.ts`):
 *
 * - `GET /health` → 200 `{ status: 'ok' }` (liveness, no dependencies)
 * - `GET /health/ready` → 200 `{ status: 'ready' }` when the database
 *   answers; 503 with a generic message (no internals) when it does not
 * - security headers are present on responses (Helmet defaults, with the two
 *   documented exceptions: no CSP because of Swagger UI, CORP cross-origin
 *   because the frontend loads backend-hosted images cross-origin)
 * - unknown routes return 404 without leaking stack traces
 */
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { createAppValidationPipe } from 'src/common/pipes/app-validation.pipe';
import { applySecurityHeaders } from 'src/common/config/security-headers';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { config } from 'dotenv';
import type { Server } from 'http';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { HealthController } from './health.controller';
import type { AppModule as AppModuleType } from '../app/app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_health_test';

describe('Health probes, security headers and error hygiene', () => {
  let app: INestApplication;

  const appServer = (): Server => app.getHttpServer() as Server;

  /** supertest's `res.body` is `any` — narrow it before reading fields. */
  const bodyOf = (res: request.Response): Record<string, unknown> =>
    res.body as Record<string, unknown>;

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads —
    // TypeOrmConfig() reads process.env at module import time.
    process.env.DB_NAME = TEST_DB;
    // R-04: keep the global limiter ACTIVE but deterministic for this suite —
    // a generous window so its request volume never trips a 429.
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
    }).compile();

    app = moduleRef.createNestApplication();
    // Same security-header configuration as production (main.ts).
    applySecurityHeaders(app);
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ---------------------------------------------------------------- liveness

  it('GET /health returns 200 { status: "ok" }', async () => {
    const res = await request(appServer()).get('/health');

    expect(res.status).toBe(200);
    expect(bodyOf(res).status).toBe('ok');
  });

  // ---------------------------------------------------------------- readiness

  it('GET /health/ready returns 200 when the database answers', async () => {
    const res = await request(appServer()).get('/health/ready');

    expect(res.status).toBe(200);
    expect(bodyOf(res).status).toBe('ready');
  });

  it('readiness fails with 503 and no internals when the database is down', async () => {
    const broken = {
      query: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.1')),
    };
    const controller = new HealthController(broken as unknown as DataSource);

    const outcome = await controller.readiness().then(
      () => 'resolved',
      (error: unknown) => error,
    );

    expect(outcome).toBeInstanceOf(ServiceUnavailableException);
    const exception = outcome as ServiceUnavailableException;
    expect(exception.getStatus()).toBe(503);
    // The wire body must be the generic message — never the SQL error.
    expect(JSON.stringify(exception.getResponse())).not.toContain(
      'ECONNREFUSED',
    );
    expect(JSON.stringify(exception.getResponse())).not.toContain('stack');
  });

  // -------------------------------------------------------- security headers

  it('sets security headers without breaking the API', async () => {
    const res = await request(appServer()).get('/health');

    expect(res.status).toBe(200);
    // Helmet defaults.
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-powered-by']).toBeUndefined();
    // Documented exception: backend images are public and loaded
    // cross-origin by the frontend, so CORP must allow cross-origin loads.
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    // Documented exception: no CSP, because Swagger UI serves inline scripts.
    expect(res.headers['content-security-policy']).toBeUndefined();
    // The API contract itself is untouched by the headers.
    expect(bodyOf(res).status).toBe('ok');
  });

  // ------------------------------------------------------------ error hygiene

  it('unknown routes return 404 without leaking stack traces', async () => {
    const res = await request(appServer()).get('/definitely-missing-route');

    expect(res.status).toBe(404);
    expect(bodyOf(res).stack).toBeUndefined();
    expect(JSON.stringify(bodyOf(res))).not.toContain('stack');
  });
});
