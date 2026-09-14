import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { BlogEntity } from 'src/modules/blog/entities/blog.entity';
import { BlogCommenrtEntity } from 'src/modules/blog/entities/comment.entity';
import { NotificationType } from '../enums/type.enum';
import { Column, CreateDateColumn, Entity, Index, ManyToOne } from 'typeorm';

/**
 * One notification row per (recipient, event). FKs to actor/blog/comment are
 * SET NULL so history survives deletions; the recipient row cascades with the
 * user account. The composite index serves the badge/list query:
 * recipient + unread flag, newest first.
 */
@Entity(EntityName.Notification)
@Index(['recipientId', 'isRead', 'created_at'])
export class NotificationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 24 })
  type: NotificationType;
  @Column()
  recipientId: number;
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  recipient: UserEntity;
  @Column({ nullable: true })
  actorId: number | null;
  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  actor: UserEntity | null;
  @Column({ nullable: true })
  blogId: number | null;
  @ManyToOne(() => BlogEntity, { onDelete: 'SET NULL', nullable: true })
  blog: BlogEntity | null;
  @Column({ nullable: true })
  commentId: number | null;
  @ManyToOne(() => BlogCommenrtEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  comment: BlogCommenrtEntity | null;
  @Column({ default: false })
  isRead: boolean;
  @CreateDateColumn()
  created_at: Date;
}
