import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from '../user/entities/user.entity';
import { AuthMessage } from 'src/common/enums/message.enum';
import { UserStatus } from 'src/modules/user/enums/status.enum';
import { refreshTtlDays } from 'src/common/utils/cookie.util';

export type SessionMeta = {
  userAgent: string | null;
  ip: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * R-05 — refresh-session lifecycle: create, rotate, revoke.
 *
 * Invariants:
 * - the raw token exists only in the Set-Cookie header; the DB stores a
 *   SHA-256 hash,
 * - rotation is an atomic claim (conditional UPDATE) so two concurrent
 *   refreshes with the same cookie can never both win,
 * - presenting an already-rotated/revoked token revokes the ENTIRE family —
 *   a stolen token used after rotation burns the attacker's copy and the
 *   legitimate one alike (standard reuse-detection trade-off),
 * - blocked users and deleted users can never obtain a new token.
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessions: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Issues a brand-new refresh token + session row (new rotation family unless given). */
  async createSession(
    userId: number,
    meta: SessionMeta,
    familyId?: string,
  ): Promise<{ raw: string; session: SessionEntity }> {
    const raw = randomBytes(32).toString('base64url');
    // Bounded cleanup: a user's long-dead rows never pile up. Rows that are
    // expired but NOT yet seen again are deleted here; revoked-but-unexpired
    // rows are kept because they are what makes reuse detection possible.
    await this.sessions
      .createQueryBuilder()
      .delete()
      .where('userId = :userId AND "expiresAt" < NOW()', { userId })
      .execute();
    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        refreshTokenHash: SessionService.hashToken(raw),
        familyId: familyId ?? randomUUID(),
        expiresAt: new Date(Date.now() + refreshTtlDays() * ONE_DAY_MS),
        userAgent: meta.userAgent ? meta.userAgent.slice(0, 512) : null,
        ip: meta.ip ? meta.ip.slice(0, 64) : null,
      }),
    );
    return { raw, session };
  }

  /**
   * Validates the presented refresh token and rotates it: claims the old row
   * atomically, then issues a new row in the same family.
   * Throws 401 (invalid/expired/reused) or 403 (user blocked).
   */
  async rotateSession(
    rawToken: string,
    meta: SessionMeta,
  ): Promise<{ raw: string; session: SessionEntity }> {
    const hash = SessionService.hashToken(rawToken);
    const existing = await this.sessions.findOneBy({ refreshTokenHash: hash });
    if (!existing) throw new UnauthorizedException(AuthMessage.LoginAgin);

    // Reuse of a revoked (already-rotated or logged-out) token = theft signal.
    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException(AuthMessage.LoginAgin);
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(AuthMessage.LoginAgin);
    }

    // Atomic claim — only one concurrent refresh can win this exact row.
    const claimed = await this.sessions
      .createQueryBuilder()
      .update(SessionEntity)
      .set({ revokedAt: () => 'NOW()' })
      .where('id = :id AND "revokedAt" IS NULL', { id: existing.id })
      .execute();
    if (!claimed.affected) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException(AuthMessage.LoginAgin);
    }

    const user = await this.users.findOneBy({ id: existing.userId });
    if (!user) {
      // Deleted account (cascade should already have removed the row — this
      // is defense in depth): never mint a token for a missing user.
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException(AuthMessage.LoginAgin);
    }
    if (user.status === UserStatus.Block) {
      await this.revokeFamily(existing.familyId);
      throw new ForbiddenException(AuthMessage.Blocked);
    }

    return this.createSession(existing.userId, meta, existing.familyId);
  }

  /** Revokes the whole family owning this token. Unknown token = no-op. */
  async revokeByRawToken(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const existing = await this.sessions.findOneBy({
      refreshTokenHash: SessionService.hashToken(rawToken),
    });
    if (!existing) return;
    await this.revokeFamily(existing.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(SessionEntity)
      .set({ revokedAt: () => 'NOW()' })
      .where('"familyId" = :familyId AND "revokedAt" IS NULL', { familyId })
      .execute();
  }
}
