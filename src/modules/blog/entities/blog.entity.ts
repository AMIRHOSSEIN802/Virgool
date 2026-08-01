import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { BlogStatus } from '../enums/status.enum';

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
  @CreateDateColumn()
  created_at: Date;
  @UpdateDateColumn()
  updated_at: Date;
}
