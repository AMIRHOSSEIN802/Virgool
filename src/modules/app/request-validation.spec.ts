/**
 * R-06 strict request validation + pagination bounds — integration tests
 * against a REAL PostgreSQL schema, using the exact pipe factory that
 * main.ts registers in production (whitelist + forbidNonWhitelisted +
 * transform, no implicit conversion).
 *
 * Covered:
 *  - known query/body keys pass; unknown keys are rejected with a sanitized
 *    400 that names the offending property;
 *  - @Type conversions reach the service (numeric page/limit survive);
 *  - service-level behavior (401/403/404 contracts, Persian messages) is
 *    unchanged by the stricter pipe — ownership/authz rules untouched;
 *  - the frontend's full create-blog payload still works end-to-end;
 *  - pagination is bounded on every endpoint: MAX_PAGE_SIZE/MAX_PAGE_NUMBER
 *    enforced with a 400, defaults (1/10) preserved, solver clamps as
 *    defense in depth, and unknown pagination keys are rejected.
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
import { BlogEntity } from '../blog/entities/blog.entity';
import { BlogCategoryEntity } from '../blog/entities/blog-category.entity';
import { CategoryEntity } from '../category/entities/category.entity';
import { Roles } from 'src/common/enums/role.eunm';
import { UserStatus } from '../user/enums/status.enum';
import {
  BadRequestMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { MAX_PAGE_NUMBER, MAX_PAGE_SIZE } from 'src/common/dtos/pagination.dto';
import { paginationSolver } from 'src/common/utils/pagination.util';
import type { AppModule as AppModuleType } from '../app/app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_validation_test';

describe('Strict request validation + pagination bounds (R-06)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const jwt = new JwtService();
  const fixtureUserIds: number[] = [];
  let seq = 0;

  // Seeded in beforeAll — the authz matrix below needs a real user, admin.
  let plainUser!: { id: number };
  let adminUser!: { id: number };

  // Cleanup bookkeeping for the one blog the valid-create test inserts.
  let createdAuthorId: number | undefined;
  const createdCategoryTitles: string[] = [];

  const unique = (prefix: string) =>
    `${prefix}_${Date.now()}_${++seq}_${Math.random().toString(36).slice(2, 7)}`;

  const tokenFor = (userId: number) =>
    jwt.sign(
      { userId },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1y' },
    );

  const appServer = (): Server => app.getHttpServer() as Server;

  const auth = (userId: number) => `Bearer ${tokenFor(userId)}`;

  const feed = (query = '') => request(appServer()).get(`/blog${query}`);

  /** supertest's `res.body` is `any` — narrow it before reading fields. */
  const bodyOf = (res: request.Response): Record<string, unknown> =>
    res.body as Record<string, unknown>;

  const paginationOf = (
    res: request.Response,
  ): { page: number; limit: number } =>
    bodyOf(res).pagination as { page: number; limit: number };

  const users = () => ds.getRepository(UserEntity);
  const profiles = () => ds.getRepository(ProfileEntity);
  const blogs = () => ds.getRepository(BlogEntity);
  const blogCategories = () => ds.getRepository(BlogCategoryEntity);
  const categories = () => ds.getRepository(CategoryEntity);

  const createUser = async (role: Roles, prefix: string) => {
    const username = unique(prefix);
    const email = `${username}@val.test`;
    const result = await users().insert({
      username,
      email,
      role,
      status: UserStatus.Active,
      verify_email: true,
    });
    const id = Number(result.identifiers[0].id);
    fixtureUserIds.push(id);
    return { id, email };
  };

  /** Mirrors exactly what the frontend's create-blog form submits. */
  const validBlogPayload = () => ({
    title: unique('Validation blog title'),
    slug: unique('valslug'),
    time_for_study: '5',
    description: 'توضیحات کافی برای تست اعتبارسنجی سخت‌گیرانه ورودی‌ها',
    content: `${'محتوای آزمایشی طولانی برای پاس شدن حداقل طول. '.repeat(4)}پایان`,
    categories: [unique('valcat')],
  });

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads —
    // TypeOrmConfig() reads process.env at module import time.
    process.env.DB_NAME = TEST_DB;
    // R-04 is covered by rate-limit.spec.ts — keep this suite far from the
    // window so it only exercises R-06 behavior.
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
    // main.ts registers cookie-parser and the strict pipe — mirror both.
    app.use(cookieParser());
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
    ds = app.get(DataSource);

    plainUser = await createUser(Roles.User, 'valuser');
    adminUser = await createUser(Roles.Admin, 'valadmin');
  });

  afterAll(async () => {
    if (app) {
      // Remove every fixture this suite created — only fixture ids/titles
      // are ever touched (junctions first, then blog, then category).
      try {
        if (createdAuthorId) {
          const rows = await blogs().find({
            where: { authorId: createdAuthorId },
          });
          for (const row of rows) {
            await blogCategories().delete({ blogId: row.id });
          }
          await blogs().delete({ authorId: createdAuthorId });
        }
        for (const title of createdCategoryTitles) {
          await categories().delete({ title });
        }
      } catch {
        // best effort — the rows may already be gone
      }
      for (const id of fixtureUserIds) {
        try {
          await users().delete({ id });
          await profiles().delete({ userId: id });
        } catch {
          // best effort — the rows may already be gone
        }
      }
      await app.close();
    }
  });

  // ------------------------------------------------------ strict validation

  describe('strict pipe (whitelist + forbidNonWhitelisted + transform)', () => {
    it('accepts the known query keys of a normal feed request', async () => {
      const res = await feed('?category=foo&search=bar&page=1&limit=5');
      expect(res.status).toBe(200);
    });

    it('rejects an unknown query key and names the property', async () => {
      const res = await feed('?nope=1');

      expect(res.status).toBe(400);
      const body = bodyOf(res);
      expect(Object.keys(body).sort()).toEqual([
        'error',
        'message',
        'statusCode',
      ]);
      expect(JSON.stringify(body.message)).toContain('nope');
      const raw = JSON.stringify(body);
      expect(raw).not.toMatch(/SELECT|node_modules|at Object\./);
    });

    it('rejects an unknown body property before the service runs', async () => {
      const res = await request(appServer()).post('/auth/user-existence').send({
        method: 'email',
        type: 'login',
        username: 'someone@val.test',
        evilField: 1,
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(bodyOf(res).message)).toContain('evilField');
    });

    it('applies @Type conversions that reach the service', async () => {
      // Without transform+@Type these would stay strings and fail @IsInt —
      // a 200 here proves numbers arrive at paginationSolver.
      const res = await request(appServer()).get('/category?page=2&limit=5');
      expect(res.status).toBe(200);
    });

    it('lets a valid body reach the service (401 from service, not 400)', async () => {
      const res = await request(appServer())
        .post('/auth/user-existence')
        .send({
          method: 'email',
          type: 'login',
          username: `nobody_${Date.now()}@val.test`,
        });

      expect(res.status).toBe(401);
    });

    it('rejects an invalid enum filter value', async () => {
      const res = await request(appServer())
        .get('/user/list?role=hacker')
        .set('Authorization', auth(adminUser.id));

      expect(res.status).toBe(400);
      expect(JSON.stringify(bodyOf(res)).toLowerCase()).toContain('role');
    });

    it('create-blog: the full frontend payload passes the strict pipe', async () => {
      const payload = validBlogPayload();
      createdAuthorId = plainUser.id;
      createdCategoryTitles.push(payload.categories[0]);

      const res = await request(appServer())
        .post('/blog')
        .set('Authorization', auth(plainUser.id))
        .send(payload);

      expect(res.status).toBe(201);
      expect(bodyOf(res).message).toBe(PublicMessage.Created);

      // The stored slug is passed through createSlug() (pre-existing
      // behavior), so the blog is looked up by its unique title instead.
      const blog = await blogs().findOneBy({
        authorId: plainUser.id,
        title: payload.title,
      });
      expect(blog).not.toBeNull();
      expect(blog?.authorId).toBe(plainUser.id);
    });

    it('create-blog: missing categories keeps the Persian 400 contract', async () => {
      const payload = validBlogPayload();
      delete (payload as Partial<typeof payload>).categories;

      const res = await request(appServer())
        .post('/blog')
        .set('Authorization', auth(plainUser.id))
        .send(payload);

      expect(res.status).toBe(400);
      expect(JSON.stringify(bodyOf(res).message)).toContain(
        BadRequestMessage.invalidCategorise,
      );
    });

    it('create-blog: an unknown body property is rejected without side effects', async () => {
      const payload = validBlogPayload();
      const before = await blogs().count({ where: { authorId: plainUser.id } });

      const res = await request(appServer())
        .post('/blog')
        .set('Authorization', auth(plainUser.id))
        .send({ ...payload, adminOnlyFlag: true });

      expect(res.status).toBe(400);
      expect(JSON.stringify(bodyOf(res).message)).toContain('adminOnlyFlag');

      const after = await blogs().count({ where: { authorId: plainUser.id } });
      expect(after).toBe(before);
    });

    it('keeps the authz matrix untouched (401 guest / 403 user / 200 admin)', async () => {
      const guest = await request(appServer()).get('/user/list');
      expect(guest.status).toBe(401);

      const asUser = await request(appServer())
        .get('/user/list')
        .set('Authorization', auth(plainUser.id));
      expect(asUser.status).toBe(403);

      const asAdmin = await request(appServer())
        .get('/user/list')
        .set('Authorization', auth(adminUser.id));
      expect(asAdmin.status).toBe(200);
    });
  });

  // ------------------------------------------------------------ pagination

  describe('pagination bounds (page/limit)', () => {
    it('documents the shipped hard limits', () => {
      // 100 = the largest page the frontend requests (create-blog category
      // suggestions); 10_000 bounds the deepest possible OFFSET.
      expect(MAX_PAGE_SIZE).toBe(100);
      expect(MAX_PAGE_NUMBER).toBe(10000);
    });

    it('defaults to page 1 / limit 10 when nothing is sent', async () => {
      const res = await feed();
      expect(res.status).toBe(200);
      expect(paginationOf(res)).toMatchObject({ page: 1, limit: 10 });
    });

    it('echoes explicit values back through the service', async () => {
      const res = await feed('?page=3&limit=7');
      expect(res.status).toBe(200);
      expect(paginationOf(res)).toMatchObject({ page: 3, limit: 7 });
    });

    it('accepts every limit the frontend actually sends (12/50/100)', async () => {
      for (const limit of [12, 50, 100]) {
        const res = await feed(`?page=1&limit=${limit}`);
        expect(res.status).toBe(200);
        expect(paginationOf(res).limit).toBe(limit);
      }
    });

    it('rejects out-of-range page/limit values with a 400', async () => {
      const cases: [string, string][] = [
        ['limit', '101'],
        ['limit', '1000000'],
        ['limit', '0'],
        ['limit', '-5'],
        ['page', '0'],
        ['page', '-1'],
      ];
      for (const [key, value] of cases) {
        const res = await feed(`?${key}=${value}`);
        expect(res.status).toBe(400);
      }
    });

    it('rejects non-numeric pagination values with a 400', async () => {
      const res = await feed('?page=abc');
      expect(res.status).toBe(400);
    });

    it('rejects unknown pagination keys (offset style queries)', async () => {
      const res = await feed('?offset=999999');
      expect(res.status).toBe(400);
      expect(JSON.stringify(bodyOf(res).message)).toContain('offset');
    });

    it('works on an authenticated paginated endpoint too', async () => {
      const res = await request(appServer())
        .get('/notification?page=1&limit=10')
        .set('Authorization', auth(plainUser.id));
      expect(res.status).toBe(200);
    });

    it('clamps the solver defensively (no unbounded queries internally)', () => {
      expect(paginationSolver({})).toEqual({ page: 1, limit: 10, skip: 0 });
      expect(paginationSolver({ page: 4, limit: 1_000_000 })).toEqual({
        page: 4,
        limit: MAX_PAGE_SIZE,
        skip: (4 - 1) * MAX_PAGE_SIZE,
      });
      expect(paginationSolver({ page: 0, limit: -3 })).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
      });
      expect(
        paginationSolver({ page: Number('abc'), limit: Number('xyz') }),
      ).toEqual({ page: 1, limit: 10, skip: 0 });
      expect(paginationSolver({ page: 2, limit: 101 })).toEqual({
        page: 2,
        limit: 100,
        skip: 100,
      });
    });
  });
});
