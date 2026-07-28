import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import { Column, Entity, OneToOne } from 'typeorm';
import { UserEntity } from './user.entity';
import { AuthMethod } from 'src/modules/auth/enums/method.enums';

@Entity(EntityName.otp)
export class OtpEntity extends BaseEntity {
  @Column()
  code: string;
  @Column()
  expiresIn: Date;
  @Column()
  userId: number;
  @Column({ nullable: true })
  method: AuthMethod;
  @OneToOne(() => UserEntity, (user) => user.otp, { onDelete: 'CASCADE' })
  user: UserEntity;
}
