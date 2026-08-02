import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BlogEntity } from './blog.entity';

@Entity(EntityName.BlogLikes)
export class BlogLikeEntity extends BaseEntity {
  @Column()
  blogId: number;
  @Column()
  userId: number;
  @ManyToOne(() => UserEntity, (user) => user.blog_like, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
  @ManyToOne(() => BlogEntity, (blog) => blog.likes, { onDelete: 'CASCADE' })
  blog: BlogEntity;
}
