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
export class BlogCommenrtEntity extends BaseEntity {
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
  @ManyToOne(() => UserEntity, (user) => user.blog_commets, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
  @ManyToOne(() => BlogEntity, (blog) => blog.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blogId' })
  blog: BlogEntity;
  @ManyToOne(() => BlogCommenrtEntity, (comment) => comment.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: BlogCommenrtEntity | null;

  @OneToMany(() => BlogCommenrtEntity, (comment) => comment.parent)
  children: BlogCommenrtEntity[];
  @CreateDateColumn()
  created_at: Date;
}
