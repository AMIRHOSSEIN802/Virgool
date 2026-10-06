import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { Column, CreateDateColumn, Entity, Index, ManyToOne } from 'typeorm';
import { UserEntity } from 'src/modules/user/entities/user.entity';

/**
 * R-05 — server-side refresh session.
 *
 * One row per issued refresh token; rotation appends a NEW row in the same
 * `familyId` and revokes the old one. Only a SHA-256 hash of the opaque
 * refresh token is stored — a database dump never yields a usable credential.
 *
 * - `revokedAt IS NULL` + `expiresAt > NOW()` = the only state that can
 *   rotate into a new token.
 * - A revoked-but-not-yet-expired row is what makes reuse detection work:
 *   presenting its token again is a theft signal and kills the whole family.
 * - `userId` cascades with the user, so deleting an account destroys every
 *   session it owns (account deletion contract, unchanged).
 */
@Entity(EntityName.Session)
@Index(['userId'])
@Index(['familyId'])
@Index(['refreshTokenHash'])
export class SessionEntity extends BaseEntity {
  @Column()
  userId: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  /** SHA-256 hex of the raw refresh token — the raw value never hits the DB. */
  @Column()
  refreshTokenHash: string;

  /** Rotation family; reuse of any rotated token revokes every row in it. */
  @Column()
  familyId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  /** Set on rotation, logout, family revocation (reuse/blocked/deleted). */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;
}
