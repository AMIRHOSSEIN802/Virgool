import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { Column, CreateDateColumn, Entity, Index, OneToOne } from 'typeorm';
import { UserEntity } from './user.entity';
import { AuthMethod } from 'src/modules/auth/enums/method.enums';

/**
 * One OTP row per user (OneToOne). Extended for B4 abuse protection:
 * - createdAt     : anchor of the 10-minute OTP request window
 * - requestCount  : OTP requests made inside the current window (max 3)
 * - failedAttempts: failed verifications for the CURRENT code (max 5)
 * - consumedAt    : set when the code is successfully verified
 *
 * Limits are enforced with atomic conditional UPDATEs (no read-modify-write),
 * so concurrent requests cannot bypass them. No Redis required.
 */
@Entity(EntityName.otp)
@Index(['userId'])
export class OtpEntity extends BaseEntity {
  @Column()
  code: string;
  @Column()
  expiresIn: Date;
  @Column()
  userId: number;
  @Column({ nullable: true })
  method: AuthMethod;
  @CreateDateColumn()
  createdAt: Date;
  @Column({ default: 0 })
  requestCount: number;
  @Column({ default: 0 })
  failedAttempts: number;
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;
  @OneToOne(() => UserEntity, (user) => user.otp, { onDelete: 'CASCADE' })
  user: UserEntity;
}
