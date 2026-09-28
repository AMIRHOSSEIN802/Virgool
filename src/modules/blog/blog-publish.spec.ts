/**
 * POST /blog/:id/publish â€” authorization, idempotency and visibility (R-02).
 *
 * The endpoint already existed; this suite pins its verified contract against
 * a REAL PostgreSQL schema (virgool_blog_publish_test, created automatically)
 * so the development database is never touched:
 *
 *  - owner        â†’ 201, status becomes 'published' (only the status changes)
 *  - admin        â†’ 201 (may publish anyone's blog)
 *  - other user   â†’ 403, status untouched
 *  - missing blog â†’ 404
 *  - guest        â†’ 401 (AuthGuard)
 *  - repeat       â†’ 201 (idempotent, no error)
 *
 * And the visibility rules that make publishing meaningful (requirement 11):
 *  - drafts never appear in the public feed/search or suggestions and are
 *    404 by slug for everyone except their author (or an Admin),
 *  - publishing makes the blog appear in the feed/search/suggestions,
 *  - draft privacy stays intact for non-owners at every step.
 */
import { INestApplication } from '@nestjs/common';
import { createAppValidationPipe } from 'src/common/pipes/app-validation.pipe';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Client } from 'pg';
import { config } from 'dotenv';
import type { Server } from 'http';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { UserEntity } from '../user/entities/user.entity';
import { BlogEntity } from './entities/blog.entity';
import { BlogStatus } from './enums/status.enum';
import { Roles } from 'src/common/enums/role.eunm';
import {
  ForbiddenMessage,
  NotFoundMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import type { AppModule as AppModuleType } from '../app/app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_blog_publish_test';

describe('POST /blog/:id/publish (R-02 contract)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const jwt = new JwtService();
  const fixtureUserIds: number[] = [];
  let seq = 0;

  const unique = (prefix: string) =>
    `${prefix}_${Date.now()}_${++seq}_${Math.random().toString(36).slice(2, 7)}`;

  const tokenFor = (userId: number) =>
    jwt.sign(
      { userId },
      { secret: process.env.ACCESS_TOKEN_SECRET, expiresIn: '1y' },
    );

  const auth = (userId: number) => `Bearer ${tokenFor(userId)}`;

  const appServer = (): Server => app.getHttpServer() as Server;

  const publish = (blogId: number, userId?: number) => {
    const req = request(appServer()).post(`/blog/${blogId}/publish`);
    return userId === undefined ? req : req.set('Authorization', auth(userId));
  };

  const bySlug = (slug: string, userId?: number) => {
    const req = request(appServer()).get(`/blog/by-slug/${slug}`);
    return userId === undefined ? req : req.set('Authorization', auth(userId));
  };

  const searchFeed = (term: string) =>
    request(appServer()).get('/blog').query({ search: term });

  /** supertest's `res.body` is `any` â€” narrow it before reading fields. */
  const bodyOf = (res: request.Response): Record<string, unknown> =>
    res.body as Record<string, unknown>;

  const feedIds = (res: request.Response) =>
    (bodyOf(res).blogs as { id: number }[]).map((b) => b.id);

  const suggestedIds = (res: request.Response) =>
    (bodyOf(res).suggestBlogs as { id: number }[]).map((b) => b.id);

  // ------------------------------------------------------------- repositories

  const users = () => ds.getRepository(UserEntity);
  const blogs = () => ds.getRepository(BlogEntity);

  // ---------------------------------------------------------------- fixtures

  const createUser = async (opts: { role?: Roles } = {}) => {
    const username = unique('pubuser');
    const result = await users().insert({
      username,
      email: `${username}@pub.test`,
      role: opts.role ?? Roles.User,
      verify_email: true,
    });
    const id = Number(result.identifiers[0].id);
    fixtureUserIds.push(id);
    return { id, username };
  };

  const createBlog = async (authorId: number, status: BlogStatus) => {
    const title = `${unique('pubtitle')} Ù…Ù‚Ø§Ù„Ù‡`;
    const slug = unique('pubslug');
    const result = await blogs().insert({
      title,
      // The slug doubles as a search token (feed search matches title AND
      // description), so each blog is individually findable in `GET /blog?search`.
      description: `${title} â€” ØªÙˆØ¶ÛŒØ­Ø§Øª ${slug}`,
      content: '<p>Ù…Ø­ØªÙˆØ§ÛŒ Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ</p>',
      slug,
      time_for_study: '5 Ø¯Ù‚ÛŒÙ‚Ù‡',
      status,
      authorId,
    });
    return { id: Number(result.identifiers[0].id), slug, title };
  };

  // ------------------------------------------------------------- test hooks

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads â€”
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
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();
    ds = app.get(DataSource);

    // This database belongs to this suite â€” wipe blog rows (and everything
    // referencing them) so suggestion sampling can never see stale fixtures
    // from an interrupted earlier run.
    await ds.query('TRUNCATE TABLE blog CASCADE');
  });

  afterAll(async () => {
    if (app) {
      for (const id of fixtureUserIds) {
        try {
          await users().delete({ id }); // cascades their blogs
        } catch {
          // best effort â€” the row may already be gone
        }
      }
      await app.close();
    }
  });

  // ------------------------------------------------------- authorization

  it('rejects a guest (no authentication)', async () => {
    const owner = await createUser();
    const { id } = await createBlog(owner.id, BlogStatus.Draft);

    const res = await publish(id);

    expect(res.status).toBe(401);
    expect((await blogs().findOneBy({ id }))?.status).toBe(BlogStatus.Draft);
  });

  it('lets the owner publish their own draft (201, only the status changes)', async () => {
    const owner = await createUser();
    const { id } = await createBlog(owner.id, BlogStatus.Draft);
    const before = await blogs().findOneBy({ id });

    const res = await publish(id, owner.id);

    expect(res.status).toBe(201);
    expect(bodyOf(res).message).toBe(PublicMessage.Published);

    const after = await blogs().findOneBy({ id });
    expect(after?.status).toBe(BlogStatus.Published);
    expect(after?.title).toBe(before?.title);
    expect(after?.slug).toBe(before?.slug);
    expect(after?.content).toBe(before?.content);
  });

  it('lets an admin publish someone elseâ€™s draft', async () => {
    const admin = await createUser({ role: Roles.Admin });
    const author = await createUser();
    const { id } = await createBlog(author.id, BlogStatus.Draft);

    const res = await publish(id, admin.id);

    expect(res.status).toBe(201);
    expect(bodyOf(res).message).toBe(PublicMessage.Published);
    expect((await blogs().findOneBy({ id }))?.status).toBe(
      BlogStatus.Published,
    );
  });

  it('forbids a non-owner, non-admin user with 403 and keeps the draft', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { id } = await createBlog(owner.id, BlogStatus.Draft);

    const res = await publish(id, stranger.id);

    expect(res.status).toBe(403);
    expect(bodyOf(res).message).toBe(ForbiddenMessage.AccessDenied);
    expect((await blogs().findOneBy({ id }))?.status).toBe(BlogStatus.Draft);
  });

  it('returns 404 for a missing blog', async () => {
    const user = await createUser();

    const res = await publish(99999999, user.id);

    expect(res.status).toBe(404);
    expect(bodyOf(res).message).toBe(NotFoundMessage.NotFoundPost);
  });

  it('is idempotent â€” publishing an already-published blog succeeds again', async () => {
    const owner = await createUser();
    const { id } = await createBlog(owner.id, BlogStatus.Draft);

    const first = await publish(id, owner.id);
    const second = await publish(id, owner.id);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(bodyOf(second).message).toBe(PublicMessage.Published);
    expect((await blogs().findOneBy({ id }))?.status).toBe(
      BlogStatus.Published,
    );
  });

  // ------------------------------------- visibility once published (req. 11)

  it('draft is hidden from feed/search and strangers; publishing reveals it', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { id, slug } = await createBlog(owner.id, BlogStatus.Draft);
    // Unique search token lives only in this blog's title/description.
    const token = slug;

    // Draft: absent from the public feed/searchâ€¦
    let feed = await searchFeed(token);
    expect(feed.status).toBe(200);
    expect(feedIds(feed)).not.toContain(id);

    // â€¦404 by slug for everyone except the ownerâ€¦
    expect((await bySlug(slug)).status).toBe(404);
    expect((await bySlug(slug, stranger.id)).status).toBe(404);
    expect((await bySlug(slug, owner.id)).status).toBe(200);

    // Publish â†’ now visible publicly.
    expect((await publish(id, owner.id)).status).toBe(201);

    feed = await searchFeed(token);
    expect(feedIds(feed)).toContain(id);
    expect((await bySlug(slug)).status).toBe(200);
  });

  it('suggestions never include drafts, and include the blog once published', async () => {
    // Suggestions sample up to 3 random published blogs â€” isolate the pool so
    // the assertion is deterministic (this database belongs to this suite).
    await ds.query('TRUNCATE TABLE blog CASCADE');

    const owner = await createUser();
    const draft = await createBlog(owner.id, BlogStatus.Draft);
    const host = await createBlog(owner.id, BlogStatus.Published);

    // A guest reads the published host â€” the draft must never be suggested.
    const before = await bySlug(host.slug);
    expect(before.status).toBe(200);
    const suggestedBefore = suggestedIds(before);
    expect(suggestedBefore).not.toContain(draft.id);

    // After publishing, the (now public) blog is eligible for suggestions.
    expect((await publish(draft.id, owner.id)).status).toBe(201);

    const after = await bySlug(host.slug);
    const suggestedAfter = suggestedIds(after);
    expect(suggestedAfter).toContain(draft.id);
  });
});
