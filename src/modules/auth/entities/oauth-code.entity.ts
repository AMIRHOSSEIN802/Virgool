import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { Column, CreateDateColumn, Entity, ManyToOne } from 'typeorm';
import { UserEntity } from 'src/modules/user/entities/user.entity';

/**
 * R-05 — one-time Google OAuth handoff.
 *
 * The OAuth callback no longer redirects a JWT through the browser URL. It
 * mints a random code (~60s TTL, stored as a SHA-256 hash, single-use via the
 * atomic consumedAt claim) and the frontend exchanges it for the real access
 * token + refresh cookie through POST /auth/google/exchange. A code in a
 * browser history / referrer / proxy log is worthless: it is not a token, it
 * expires in a minute, and it can be spent exactly once.
 */
@Entity(EntityName.OAuthCode)
export class OAuthCodeEntity extends BaseEntity {
  @Column()
  userId: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  /** SHA-256 hex of the one-time code. */
  @Column({ unique: true })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /** Set by the atomic claim in exchangeGoogleCode — one successful spend. */
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
