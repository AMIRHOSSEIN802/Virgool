import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { BlogStatus } from '../enums/status.enum';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { BlogLikeEntity } from './like.entity';
import { BlogBookmarkEntity } from './bookmark.entity';

@Entity(EntityName.blog)
export class BlogEntity extends BaseEntity {
  @Column()
  title: string;
  @Column()
  description: string;
  @Column()
  content: string;
  @Column()
  image: string;
  @Column({ default: BlogStatus.Draft })
  status: string;
  @Column()
  authorId: number;
  @ManyToOne(() => UserEntity, (user) => user.blogs, { onDelete: 'CASCADE' })
  author: UserEntity;
  @ManyToOne(() => BlogLikeEntity, (like) => like.blog, { onDelete: 'CASCADE' })
  likes: BlogLikeEntity;
  @ManyToOne(() => BlogBookmarkEntity, (bookmark) => bookmark.blog, {
    onDelete: 'CASCADE',
  })
  bookmarks: BlogBookmarkEntity[];
  @CreateDateColumn()
  created_at: Date;
  @UpdateDateColumn()
  updated_at: Date;
}
