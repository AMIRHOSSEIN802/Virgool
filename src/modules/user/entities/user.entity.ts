import { BaseEntity } from 'src/common/abstracts/base.entity';
import { EntityName } from 'src/common/enums/entity.eunm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { OtpEntity } from './otp.entity';
import { ProfileEntity } from './profile.entity';
import { BlogEntity } from 'src/modules/blog/entities/blog.entity';
import { BlogLikeEntity } from 'src/modules/blog/entities/like.entity';
import { BlogBookmarkEntity } from 'src/modules/blog/entities/bookmark.entity';
import { BlogCommenrtEntity } from 'src/modules/blog/entities/comment.entity';
import { ImageEntity } from 'src/modules/image/entities/image.entity';

@Entity(EntityName.User)
export class UserEntity extends BaseEntity {
  @Column({ unique: true, nullable: true })
  username: string;
  @Column({ unique: true, nullable: true })
  phone: string;
  @Column({ unique: true, nullable: true })
  email: string;
  @Column({
    type: 'varchar',
    nullable: true,
  })
  new_email: string | null;
  @Column({
    type: 'varchar',
    nullable: true,
  })
  new_Phone: string | null;
  @Column({ nullable: true, default: false })
  verify_email: boolean;
  @Column({ nullable: true, default: false })
  verify_phone: boolean;
  @Column({ nullable: true })
  password: string;
  @Column({ nullable: true })
  otpId: number;
  @Column({ nullable: true })
  profileId: number;
  @OneToOne(() => OtpEntity, (otp) => otp.user, { nullable: true })
  @JoinColumn()
  otp: OtpEntity;
  @OneToOne(() => ProfileEntity, (profile) => profile.user, { nullable: true })
  @JoinColumn()
  profile: ProfileEntity;
  @OneToMany(() => BlogEntity, (blog) => blog.author)
  blogs: BlogEntity[];
  @OneToMany(() => BlogLikeEntity, (like) => like.user)
  blog_like: BlogLikeEntity[];
  @OneToMany(() => BlogBookmarkEntity, (bookmark) => bookmark.user)
  blog_bookmaeks: BlogBookmarkEntity[];
  @OneToMany(() => BlogCommenrtEntity, (comment) => comment.user)
  blog_commets: BlogCommenrtEntity[];
  @OneToMany(() => ImageEntity, (image) => image.user)
  images: ImageEntity[];
  @CreateDateColumn()
  created_at: Date;
  @UpdateDateColumn()
  updated_at: Date;
}
