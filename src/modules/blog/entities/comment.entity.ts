import { BaseEntity } from 'src/common/abstracts/base.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BlogEntity } from './blog.entity';

export class BlogCommenrtEntity extends BaseEntity {
  @Column()
  text: string;
  @Column({ default: true })
  accepted: boolean;
  @Column()
  blogId: number;
  @Column()
  userId: number;
  @Column()
  parentId: number;
  @ManyToOne(() => UserEntity, (user) => user.blog_commets, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
  @ManyToMany(() => BlogEntity, (blog) => blog.comments, {
    onDelete: 'CASCADE',
  })
  blog: BlogEntity;
  @ManyToMany(() => BlogCommenrtEntity, (comment) => comment.children, {
    onDelete: 'CASCADE',
  })
  parent: BlogCommenrtEntity;
  @OneToMany(() => BlogCommenrtEntity, (comment) => comment.parent)
  @JoinColumn({ name: 'parent' })
  children: BlogCommenrtEntity[];
  @CreateDateColumn()
  created_at: Date;
}
