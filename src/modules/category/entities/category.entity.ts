import { EntityName } from 'src/common/enums/entity.eunm';
import { Column, Entity } from 'typeorm';

@Entity(EntityName.category)
export class CategoryEntity {
  @Column()
  title: string;
  @Column({ nullable: true })
  priority: number;
}
