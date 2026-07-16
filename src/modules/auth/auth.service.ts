import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthDto } from './dto/auth.dto';
import { AuthType } from './enums/type.enums';
import { AuthMethod } from './enums/method.enums';
import { isEmail, isMobilePhone } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { ProfileEntity } from '../user/entities/profile.entity';
import {
  AuthMessage,
  BadRequestMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { randomInt } from 'crypto';
import { OtpEntity } from '../user/entities/otp.entity';
import { TokensService } from './tokens.service';
import { CookieKeys } from 'src/common/enums/cookie.enum';
import type { Request, Response } from 'express';
import { AuthResponse } from './types/response';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(OtpEntity)
    private readonly OtpRepository: Repository<OtpEntity>,
    @Inject(REQUEST) private request: Request,
    private tokenService: TokensService,
  ) {}

  async userExistence(authDto: AuthDto, res: Response) {
    const { method, type, username } = authDto;
    let result: AuthResponse;
    switch (type) {
      case AuthType.Login:
        result = await this.login(method, username);
        // await this.sendOtp(method, username, result.code)
        return this.sendResponse(res, result);
      case AuthType.Register:
        result = await this.register(method, username);
        // await this.sendOtp(method, username, result.code)
        return this.sendResponse(res, result);
      default:
        throw new UnauthorizedException();
    }
  }

  async login(method: AuthMethod, username: string) {
    const validUsername = this.usernameValidator(method, username);
    const user = await this.checkExistUser(method, validUsername);
    if (!user) {
      throw new UnauthorizedException(AuthMessage.NotFoundAccount);
    }
    const otp = await this.saveOtp(user.id);
    const token = this.tokenService.createOtpToken({ userId: user.id });
    return {
      token,
      code: otp.code,
    };
  }

  async register(method: AuthMethod, username: string) {
    const validUsername = this.usernameValidator(method, username);
    let user = await this.checkExistUser(method, validUsername);
    // let user = await this.checkExistUser(method, validUsername);
    if (user) throw new ConflictException(AuthMessage.AlreadyExistAccount);
    if (method === AuthMethod.Username)
      throw new BadRequestException(BadRequestMessage.InValidReqisterDate);
    user = this.userRepository.create({
      [method]: username,
    });
    user = await this.userRepository.save(user);
    user.username = `m_${user.id}`;
    await this.userRepository.save(user);
    const otp = await this.saveOtp(user.id);
    const token = this.tokenService.createOtpToken({ userId: user.id });
    return {
      token,
      code: otp.code,
    };
  }
  sendResponse(res: Response, result: AuthResponse) {
    const { code, token } = result;
    res.cookie(CookieKeys.OTP, token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 2),
    });
    res.json({
      message: PublicMessage.SendOtp,
      code,
    });
  }

  async saveOtp(userId: number) {
    const code = randomInt(10000, 99999).toString();
    const expiresIn = new Date(Date.now() + 1000 * 60 * 2);
    let otp = await this.OtpRepository.findOneBy({ userId });
    let existOtp = false;
    if (otp) {
      existOtp = true;
      otp.code = code;
      otp.expiresIn = expiresIn;
    } else {
      otp = this.OtpRepository.create({
        code,
        expiresIn,
        userId,
      });
    }
    otp = await this.OtpRepository.save(otp);
    if (!existOtp) {
      await this.userRepository.update(
        { id: userId },
        {
          otpId: otp.id,
        },
      );
    }
    return otp;
  }

  checkOtp(code: string) {
    const token = this.request.cookies?.[CookieKeys.OTP];
    if (!token) throw new UnauthorizedException(AuthMessage.ExiredCode);
    return {
      code,
      token,
    };
  }
  async checkExistUser(
    method: AuthMethod,
    username: string,
  ): Promise<UserEntity | null> {
    if (method === AuthMethod.phone) {
      return await this.userRepository.findOneBy({ phone: username });
    }

    if (method === AuthMethod.Emai) {
      return await this.userRepository.findOneBy({ email: username });
    }

    if (method === AuthMethod.Username) {
      return await this.userRepository.findOneBy({ username });
    }

    return null;
  }

  usernameValidator(method: AuthMethod, username: string): string {
    switch (method) {
      case AuthMethod.Emai:
        if (isEmail(username)) return username;
        throw new BadRequestException('email format is incorrect');

      case AuthMethod.phone:
        if (isMobilePhone(username, 'fa-IR')) return username;
        throw new BadRequestException('mobile number is incorrect');

      case AuthMethod.Username:
        return username;

      default:
        throw new UnauthorizedException('username data is not valid');
    }
  }
}
