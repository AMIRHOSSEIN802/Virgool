import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { BlogStatus } from '../enums/status.enum';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { BlogLikeEntity } from './like.entity';
import { BlogBookmarkEntity } from './bookmark.entity';
import { BlogCommenrtEntity } from './comment.entity';
import { BlogCategoryEntity } from './blog-category.entity';

@Entity(EntityName.blog)
export class BlogEntity extends BaseEntity {
  @Column()
  title: string;
  @Column()
  description: string;
  @Column()
  content: string;
  @Column({ nullable: true })
  image: string;
  @Column({ unique: true })
  slug: string;
  @Column()
  time_for_study: string;
  @Column({ default: BlogStatus.Draft })
  status: string;
  @Column()
  authorId: number;
  @ManyToOne(() => UserEntity, (user) => user.blogs, { onDelete: 'CASCADE' })
  author: UserEntity;
  @VirtualColumn({
    query: (alias) =>
      `SELECT COUNT(*)::int
     FROM "${EntityName.BlogLikes}"
     WHERE "blogId" = ${alias}.id`,
  })
  @OneToMany(() => BlogLikeEntity, (like) => like.blog, { onDelete: 'CASCADE' })
  likes: BlogLikeEntity;
  likeCount: number;
  @OneToMany(() => BlogCategoryEntity, (category) => category.blog, {
    onDelete: 'CASCADE',
  })
  categories: BlogCategoryEntity;
  @VirtualColumn({
    query: (alias) =>
      `SELECT COUNT(*)::int
     FROM "${EntityName.BlogBookmark}"
     WHERE "blogId" = ${alias}.id`,
  })
  @OneToMany(() => BlogBookmarkEntity, (bookmark) => bookmark.blog, {
    onDelete: 'CASCADE',
  })
  bookmarks: BlogBookmarkEntity[];
  @OneToMany(() => BlogCommenrtEntity, (comment) => comment.blog)
  comments: BlogCommenrtEntity[];
  @CreateDateColumn()
  created_at: Date;
  @UpdateDateColumn()
  updated_at: Date;
}
