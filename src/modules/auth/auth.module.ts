import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from './tokens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { OtpEntity } from '../user/entities/otp.entity';
import { ProfileEntity } from '../user/entities/profile.entity';
import { GoogleAuthController } from './google.controller';
import { GoogleStrategy } from './strategy/google.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, OtpEntity, ProfileEntity])],
  controllers: [AuthController, GoogleAuthController],
  providers: [AuthService, JwtService, TokensService, GoogleStrategy],
  exports: [
    AuthService,
    JwtService,
    TokensService,
    TypeOrmModule,
    GoogleStrategy,
  ],
})
export class AuthModule {}
