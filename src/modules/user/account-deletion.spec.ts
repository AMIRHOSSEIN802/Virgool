/**
 * Account deletion — integration tests against a REAL PostgreSQL schema.
 *
 * The suite bootstraps the Nest app pointed at a dedicated test database
 * (virgool_account_test, created automatically) so nothing in the development
 * database is ever touched. It therefore needs a reachable PostgreSQL, same as
 * the application itself.
 *
 * Why a real database matters: every cascade asserted below (blog → likes /
 * bookmarks / comments, comment → replies, user → follows / images /
 * notifications, notification actor → SET NULL) is executed by PostgreSQL, not
 * by application code. Only a real schema can prove it.
 *
 * Covered: cases 1–14 of the account-deletion spec, plus the end-to-end
 * scenario (author deleted while third parties engage with their blog).
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
import { access, mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

import { UserEntity } from './entities/user.entity';
import { ProfileEntity } from './entities/profile.entity';
import { OtpEntity } from './entities/otp.entity';
import { FollowEntity } from './entities/follow.entity';
import { BlogEntity } from '../blog/entities/blog.entity';
import { BlogCommenrtEntity } from '../blog/entities/comment.entity';
import { BlogLikeEntity } from '../blog/entities/like.entity';
import { BlogBookmarkEntity } from '../blog/entities/bookmark.entity';
import { ImageEntity } from '../image/entities/image.entity';
import { NotificationEntity } from '../notification/entities/notification.entity';
import { Roles } from '../../common/enums/role.eunm';
import { UserStatus } from './enums/status.enum';
import { BlogStatus } from '../blog/enums/status.enum';
import { NotificationType } from '../notification/enums/type.enum';
import type { AppModule as AppModuleType } from '../app/app.module';

jest.setTimeout(180000);

const TEST_DB = 'virgool_account_test';

describe('DELETE /user/account (account deletion)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const jwt = new JwtService();
  const fixtureUserIds: number[] = [];
  const fixtureFiles: string[] = [];
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

  const del = (userId: number, username: string, extra = {}) =>
    request(appServer())
      .delete('/user/account')
      .set('Authorization', auth(userId))
      .send({ username, ...extra });

  const fileExists = async (path: string) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  };

  // ------------------------------------------------------------- repositories

  const users = () => ds.getRepository(UserEntity);
  const profiles = () => ds.getRepository(ProfileEntity);
  const otps = () => ds.getRepository(OtpEntity);
  const blogs = () => ds.getRepository(BlogEntity);
  const comments = () => ds.getRepository(BlogCommenrtEntity);
  const likes = () => ds.getRepository(BlogLikeEntity);
  const bookmarks = () => ds.getRepository(BlogBookmarkEntity);
  const follows = () => ds.getRepository(FollowEntity);
  const images = () => ds.getRepository(ImageEntity);
  const notifications = () => ds.getRepository(NotificationEntity);

  const findUser = (id: number) => users().findOne({ where: { id } });

  // ---------------------------------------------------------------- fixtures

  const createUser = async (
    opts: {
      username?: string;
      role?: Roles;
      status?: UserStatus;
    } = {},
  ) => {
    const username = opts.username ?? unique('acctdel');
    const row: Partial<UserEntity> = {
      username,
      email: `${username}@acctdel.test`,
      role: opts.role ?? Roles.User,
      verify_email: true,
    };
    if (opts.status) row.status = opts.status;

    const result = await users().insert(row);
    const id = Number(result.identifiers[0].id);
    fixtureUserIds.push(id);
    return { id, username };
  };

  const createProfile = async (userId: number) => {
    const result = await profiles().insert({
      nick_name: `acctdel ${userId}`,
      userId,
    });
    const profileId = Number(result.identifiers[0].id);
    await users().update({ id: userId }, { profileId });
    return profileId;
  };

  const createOtp = async (userId: number) => {
    const result = await otps().insert({
      code: '12345',
      expiresIn: new Date(Date.now() + 100000),
      userId,
    });
    const otpId = Number(result.identifiers[0].id);
    await users().update({ id: userId }, { otpId });
    return otpId;
  };

  const createBlog = async (
    authorId: number,
    status: BlogStatus = BlogStatus.Published,
  ) => {
    const result = await blogs().insert({
      title: 'acctdel blog',
      description: 'acctdel description',
      content: '<p>acctdel content</p>',
      slug: unique('acctdel-slug'),
      time_for_study: '5 دقیقه',
      status,
      authorId,
    });
    return Number(result.identifiers[0].id);
  };

  const createComment = async (
    blogId: number,
    userId: number,
    parentId: number | null = null,
  ) => {
    const result = await comments().insert({
      text: 'acctdel comment',
      accepted: true,
      blogId,
      userId,
      parentId,
    });
    return Number(result.identifiers[0].id);
  };

  const createLike = async (blogId: number, userId: number) => {
    await likes().insert({ blogId, userId });
  };

  const createBookmark = async (blogId: number, userId: number) => {
    await bookmarks().insert({ blogId, userId });
  };

  const createFollow = async (followerId: number, followingId: number) => {
    await follows().insert({ followerId, followingId });
  };

  const createNotification = async (input: {
    recipientId: number;
    actorId?: number | null;
    blogId?: number | null;
    commentId?: number | null;
    type?: NotificationType;
  }) => {
    const result = await notifications().insert({
      type: input.type ?? NotificationType.Comment,
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      blogId: input.blogId ?? null,
      commentId: input.commentId ?? null,
      isRead: false,
    });
    return Number(result.identifiers[0].id);
  };

  const createImage = async (userId: number) => {
    const name = `${unique('acctdel')}.jpg`;
    const relative = join('uploads', 'images', name);
    const absolute = join(process.cwd(), 'public', relative);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, 'fixture-image');
    fixtureFiles.push(absolute);
    await images().insert({
      name,
      alt: 'acctdel alt',
      location: relative,
      userId,
    });
    return { absolute, relative };
  };

  // ------------------------------------------------------------- test hooks

  beforeAll(async () => {
    // Point the application at the isolated schema BEFORE AppModule loads —
    // TypeOrmConfig() reads process.env at module import time.
    process.env.DB_NAME = TEST_DB;
    // R-04: keep the global limiter ACTIVE but deterministic for this suite —
    // a generous window so its request volume never trips a 429.
    process.env.RATE_LIMIT_TTL_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100000';

    // AppModule loads .env through ConfigModule, but the admin client below
    // connects first. dotenv never overwrites variables already set.
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
  });

  afterAll(async () => {
    if (app) {
      // Remove every fixture this suite created (cascades clean their rows),
      // then the fixture files. Only fixture ids are ever touched.
      for (const id of fixtureUserIds) {
        try {
          await users().delete({ id });
          await profiles().delete({ userId: id });
          await otps().delete({ userId: id });
        } catch {
          // best effort — the row may already be gone
        }
      }
      for (const file of fixtureFiles) {
        try {
          await rm(file, { force: true });
        } catch {
          // best effort
        }
      }
      await app.close();
    }
  });

  // ------------------------------------------------------------------ cases

  it('rejects a guest (no authentication)', async () => {
    const res = await request(appServer())
      .delete('/user/account')
      .send({ username: 'anyone' });
    expect(res.status).toBe(401);
  });

  it('CASE 1 — deletes an account that has no content', async () => {
    const { id, username } = await createUser();

    const res = await del(id, username);

    expect(res.status).toBe(200);
    const body = res.body as { message?: unknown; password?: unknown };
    expect(typeof body.message).toBe('string');
    expect(body.password).toBeUndefined();
    expect(await findUser(id)).toBeNull();
  });

  it('CASE 10 — wrong username confirmation deletes nothing', async () => {
    const { id } = await createUser();
    const blogId = await createBlog(id);

    const res = await del(id, 'not-my-username');

    expect(res.status).toBe(400);
    expect(await findUser(id)).not.toBeNull();
    expect(await blogs().countBy({ id: blogId })).toBe(1);
  });

  it('never lets the body target another account (no IDOR)', async () => {
    const victim = await createUser();
    const attacker = await createUser();

    const res = await del(attacker.id, attacker.username, {
      userId: victim.id,
      id: victim.id,
      targetId: victim.id,
    });

    // R-06 strict pipe: the hostile extra properties are rejected outright
    // (400) instead of being silently dropped — even stronger than the old
    // ignore-them contract. Either way neither account may be touched by
    // fields that are not part of DeleteAccountDto.
    expect(res.status).toBe(400);
    expect(await findUser(victim.id)).not.toBeNull();
    expect(await findUser(attacker.id)).not.toBeNull();
  });

  it('CASE 2 — a published blog is deleted with the account', async () => {
    const { id, username } = await createUser();
    const blogId = await createBlog(id, BlogStatus.Published);

    const res = await del(id, username);

    expect(res.status).toBe(200);
    expect(await findUser(id)).toBeNull();
    expect(await blogs().countBy({ id: blogId })).toBe(0);
  });

  it('CASE 3 — likes from others die with the blog, likers survive', async () => {
    const owner = await createUser();
    const blogId = await createBlog(owner.id);
    const likerB = await createUser();
    const likerC = await createUser();
    await createLike(blogId, likerB.id);
    await createLike(blogId, likerC.id);
    const blogOfB = await createBlog(likerB.id);

    const res = await del(owner.id, owner.username);

    expect(res.status).toBe(200);
    expect(await findUser(owner.id)).toBeNull();
    expect(await blogs().countBy({ id: blogId })).toBe(0);
    expect(await likes().countBy({ blogId })).toBe(0);
    expect(await findUser(likerB.id)).not.toBeNull();
    expect(await findUser(likerC.id)).not.toBeNull();
    expect(await blogs().countBy({ id: blogOfB })).toBe(1);
  });

  it('CASE 4 — comments from others die with the blog, commenters survive', async () => {
    const owner = await createUser();
    const blogId = await createBlog(owner.id);
    const commenterB = await createUser();
    const commenterD = await createUser();
    await createComment(blogId, commenterB.id);
    await createComment(blogId, commenterD.id);
    const blogOfB = await createBlog(commenterB.id);

    const res = await del(owner.id, owner.username);

    expect(res.status).toBe(200);
    expect(await findUser(owner.id)).toBeNull();
    expect(await blogs().countBy({ id: blogId })).toBe(0);
    expect(await comments().countBy({ blogId })).toBe(0);
    expect(await findUser(commenterB.id)).not.toBeNull();
    expect(await findUser(commenterD.id)).not.toBeNull();
    expect(await blogs().countBy({ id: blogOfB })).toBe(1);
  });

  it('CASE 5 — own comments and their replies go away, repliers stay', async () => {
    const bloggerB = await createUser();
    const blogOfB = await createBlog(bloggerB.id);
    const authorA = await createUser();
    const replierD = await createUser();
    const commentA = await createComment(blogOfB, authorA.id);
    await createComment(blogOfB, replierD.id); // unrelated top-level comment
    await createComment(blogOfB, replierD.id, commentA); // reply to A's comment
    const commentOfB = await createComment(blogOfB, bloggerB.id);

    const res = await del(authorA.id, authorA.username);

    expect(res.status).toBe(200);
    expect(await findUser(authorA.id)).toBeNull();
    expect(await comments().countBy({ id: commentA })).toBe(0);
    // the reply under the removed comment disappears with it
    expect(await comments().countBy({ parentId: commentA })).toBe(0);
    expect(await findUser(replierD.id)).not.toBeNull();
    expect(await findUser(bloggerB.id)).not.toBeNull();
    expect(await blogs().countBy({ id: blogOfB })).toBe(1);
    expect(await comments().countBy({ id: commentOfB })).toBe(1);
  });

  it('CASE 6 — owned likes/bookmarks/follows go away, others stay', async () => {
    const a = await createUser();
    const b = await createUser();
    const c = await createUser();
    const blogOfB = await createBlog(b.id);
    await createLike(blogOfB, a.id);
    await createBookmark(blogOfB, a.id);
    await createFollow(a.id, b.id); // a follows b
    await createFollow(b.id, a.id); // b follows a
    await createFollow(c.id, a.id); // c follows a
    await createFollow(c.id, b.id); // c follows b — must survive a's deletion

    const res = await del(a.id, a.username);

    expect(res.status).toBe(200);
    expect(await findUser(a.id)).toBeNull();
    expect(await likes().countBy({ userId: a.id })).toBe(0);
    expect(await bookmarks().countBy({ userId: a.id })).toBe(0);
    expect(await follows().countBy({ followerId: a.id })).toBe(0);
    expect(await follows().countBy({ followingId: a.id })).toBe(0);
    expect(await findUser(b.id)).not.toBeNull();
    expect(await findUser(c.id)).not.toBeNull();
    expect(await blogs().countBy({ id: blogOfB })).toBe(1);
    expect(await follows().countBy({ followerId: c.id })).toBe(1);
  });

  it('CASE 7 — leaves no orphan profile or otp row', async () => {
    const { id, username } = await createUser();
    const profileId = await createProfile(id);
    const otpId = await createOtp(id);

    const res = await del(id, username);

    expect(res.status).toBe(200);
    expect(await findUser(id)).toBeNull();
    expect(await profiles().countBy({ id: profileId })).toBe(0);
    expect(await profiles().countBy({ userId: id })).toBe(0);
    expect(await otps().countBy({ id: otpId })).toBe(0);
    expect(await otps().countBy({ userId: id })).toBe(0);
  });

  it('CASE 8 — image rows go, owned file removed, shared file kept', async () => {
    const owner = await createUser();
    const otherUser = await createUser();
    const ownImage = await createImage(owner.id);
    const sharedImage = await createImage(owner.id);
    // the very same physical file is also referenced by someone else
    await images().insert({
      name: 'shared',
      alt: 'shared',
      location: sharedImage.relative,
      userId: otherUser.id,
    });
    const otherImage = await createImage(otherUser.id);

    const res = await del(owner.id, owner.username);

    expect(res.status).toBe(200);
    expect(await images().countBy({ userId: owner.id })).toBe(0);
    expect(await fileExists(ownImage.absolute)).toBe(false);
    expect(await fileExists(sharedImage.absolute)).toBe(true);
    expect(await fileExists(otherImage.absolute)).toBe(true);
    expect(await findUser(otherUser.id)).not.toBeNull();
  });

  it('CASE 9 — blocked user can self-delete but not use other routes', async () => {
    const blocked = await createUser({ status: UserStatus.Block });
    await createProfile(blocked.id);

    const blockedProfile = await request(appServer())
      .get('/user/profile')
      .set('Authorization', auth(blocked.id));
    expect(blockedProfile.status).toBe(403);

    const res = await del(blocked.id, blocked.username);
    expect(res.status).toBe(200);
    expect(await findUser(blocked.id)).toBeNull();

    // an active user still reaches the guarded route normally
    const active = await createUser({ status: UserStatus.Active });
    await createProfile(active.id);
    const ok = await request(appServer())
      .get('/user/profile')
      .set('Authorization', auth(active.id));
    expect(ok.status).toBe(200);
  });

  it('CASE 11 — the last remaining admin cannot be deleted (409)', async () => {
    const admin = await createUser({ role: Roles.Admin });
    await createProfile(admin.id);

    const res = await del(admin.id, admin.username);

    expect(res.status).toBe(409);
    expect(await findUser(admin.id)).not.toBeNull();
    expect(await profiles().countBy({ userId: admin.id })).toBe(1);
    expect(await users().countBy({ role: Roles.Admin })).toBe(1);
  });

  it('CASE 12 — an admin may self-delete while another admin exists', async () => {
    const adminA = await createUser({ role: Roles.Admin });
    const adminB = await createUser({ role: Roles.Admin });

    const res = await del(adminA.id, adminA.username);

    expect(res.status).toBe(200);
    expect(await findUser(adminA.id)).toBeNull();
    const survivor = await findUser(adminB.id);
    expect(survivor).not.toBeNull();
    expect(survivor?.role).toBe(Roles.Admin);
  });

  it('CASE 13 — another user notification survives with a null actor', async () => {
    const authorA = await createUser();
    const bloggerB = await createUser();
    const blogOfB = await createBlog(bloggerB.id);
    const commentA = await createComment(blogOfB, authorA.id);
    const notificationId = await createNotification({
      recipientId: bloggerB.id,
      actorId: authorA.id,
      blogId: blogOfB,
      commentId: commentA,
    });

    const res = await del(authorA.id, authorA.username);

    expect(res.status).toBe(200);
    expect(await findUser(authorA.id)).toBeNull();
    expect(await findUser(bloggerB.id)).not.toBeNull();

    const kept = await notifications().findOne({
      where: { id: notificationId },
    });
    expect(kept).not.toBeNull();
    expect(kept?.recipientId).toBe(bloggerB.id);
    expect(kept?.actorId).toBeNull();
    expect(kept?.commentId).toBeNull();
    expect(await blogs().countBy({ id: blogOfB })).toBe(1);
  });

  it('CASE 14 — repeated deletion returns 401, never a 500', async () => {
    const { id, username } = await createUser();
    const first = await del(id, username);
    expect(first.status).toBe(200);

    const second = await del(id, username);

    expect(second.status).not.toBe(500);
    expect(second.status).toBe(401);
    expect(await findUser(id)).toBeNull();
  });

  it('scenario — author deleted with third-party engagement', async () => {
    const authorA = await createUser();
    const blogX = await createBlog(authorA.id, BlogStatus.Published);
    const userB = await createUser();
    const userC = await createUser();
    const userD = await createUser();

    await createLike(blogX, userB.id);
    await createLike(blogX, userC.id);
    const commentByB = await createComment(blogX, userB.id);
    const commentByD = await createComment(blogX, userD.id);
    await createComment(blogX, userD.id, commentByB); // reply under B's comment
    await createComment(blogX, userB.id, commentByD); // reply under D's comment

    // unrelated content owned by the survivors
    const blogOfB = await createBlog(userB.id);
    const blogOfD = await createBlog(userD.id);
    const commentOnBlogOfB = await createComment(blogOfB, userD.id);

    const res = await del(authorA.id, authorA.username);
    expect(res.status).toBe(200);

    expect(await findUser(authorA.id)).toBeNull();
    expect(await blogs().countBy({ id: blogX })).toBe(0);
    expect(await likes().countBy({ blogId: blogX })).toBe(0);
    expect(await comments().countBy({ blogId: blogX })).toBe(0);
    expect(await comments().countBy({ parentId: commentByB })).toBe(0);
    expect(await comments().countBy({ parentId: commentByD })).toBe(0);

    expect(await findUser(userB.id)).not.toBeNull();
    expect(await findUser(userC.id)).not.toBeNull();
    expect(await findUser(userD.id)).not.toBeNull();
    expect(await blogs().countBy({ id: blogOfB })).toBe(1);
    expect(await blogs().countBy({ id: blogOfD })).toBe(1);
    expect(await comments().countBy({ id: commentOnBlogOfB })).toBe(1);
  });
});
