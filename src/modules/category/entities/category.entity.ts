import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { BlogCategoryEntity } from 'src/modules/blog/entities/blog-category.entity';
import { Column, Entity, OneToMany, Unique } from 'typeorm';

/**
 * Category titles are unique (normalized lowercase; existing rows verified
 * duplicate-free before the constraint). The FK from blog_category is
 * ON DELETE CASCADE — deleting a category unlinks its blogs but NEVER
 * deletes the blogs themselves.
 */
@Entity(EntityName.category)
@Unique(['title'])
export class CategoryEntity extends BaseEntity {
  @Column()
  title: string;
  @Column({ nullable: true })
  priority: number;
  @OneToMany(() => BlogCategoryEntity, (blog) => blog.category)
  blog_category: [];
}
