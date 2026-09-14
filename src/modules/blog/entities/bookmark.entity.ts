import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { BlogEntity } from './blog.entity';

/**
 * One bookmark per (user, blog) pair. The unique index (created by typeorm
 * synchronize; existing data was verified duplicate-free first) makes racing
 * double-clicks impossible to double-insert.
 */
@Entity(EntityName.BlogBookmark)
@Unique(['userId', 'blogId'])
export class BlogBookmarkEntity extends BaseEntity {
  @Column()
  blogId: number;
  @Column()
  userId: number;
  @ManyToOne(() => UserEntity, (user) => user.blog_bookmaeks, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
  @ManyToOne(() => BlogEntity, (blog) => blog.likes, { onDelete: 'CASCADE' })
  blog: BlogEntity;
}
