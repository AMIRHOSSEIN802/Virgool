import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from './user.controller';
import { UserService } from './user.service';

import { UserEntity } from './entities/user.entity';
import { ProfileEntity } from './entities/profile.entity';
import { OtpEntity } from './entities/otp.entity';
import { AuthModule } from '../auth/auth.module';
import { FollowEntity } from './entities/follow.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    AuthModule,
    NotificationModule,
    TypeOrmModule.forFeature([
      UserEntity,
      ProfileEntity,
      OtpEntity,
      FollowEntity,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [TypeOrmModule, UserService],
})
export class UserModule {}
