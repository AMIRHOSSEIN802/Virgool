import { BaseEntity } from 'src/common/abstracts/base.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BlogEntity } from './blog.entity';
import { EntityName } from 'src/common/enums/entity.eunm';

@Entity(EntityName.BlogComments)
export class BlogCommentEntity extends BaseEntity {
  @Column()
  text: string;
  @Column({ default: true })
  accepted: boolean;
  @Column()
  blogId: number;
  @Column()
  userId: number;
  @Column({ nullable: true })
  parentId: number | null;
  @ManyToOne(() => UserEntity, (user) => user.blog_comments, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
  @ManyToOne(() => BlogEntity, (blog) => blog.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blogId' })
  blog: BlogEntity;
  @ManyToOne(() => BlogCommentEntity, (comment) => comment.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: BlogCommentEntity | null;

  @OneToMany(() => BlogCommentEntity, (comment) => comment.parent)
  children: BlogCommentEntity[];
  @CreateDateColumn()
  created_at: Date;
}
