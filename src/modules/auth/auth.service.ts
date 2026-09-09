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
import { DataSource, Repository } from 'typeorm';
import { ProfileEntity } from '../user/entities/profile.entity';
import {
  AuthMessage,
  BadRequestMessage,
  PublicMessage,
  RateLimitMessage,
} from 'src/common/enums/message.enum';
import { randomInt } from 'crypto';
import { OtpEntity } from '../user/entities/otp.entity';
import { TokensService } from './tokens.service';
import { CookieKeys } from 'src/common/enums/cookie.enum';
import type { Request, Response } from 'express';
import { AuthResponse, GoogleUser } from './types/response';
import { REQUEST } from '@nestjs/core';
import { CookiesOptionsToken } from 'src/common/utils/cookie.util';
import { randomId } from 'src/common/utils/functions.util';
import { HttpException, HttpStatus } from '@nestjs/common';

/** OTP abuse-protection policy (B4) */
export const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_REQUESTS_PER_WINDOW = 3;
export const OTP_MAX_FAILED_ATTEMPTS = 5;

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
    private dataSource: DataSource,
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
    const otp = await this.saveOtp(user.id, method);
    const token = this.tokenService.createOtpToken({ userId: user.id });
    console.log(otp.code);

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
    // Every user must have a Profile row — public profiles, nick_name and
    // avatar all hang off it. Without it /user/by-username returns 404.
    const profile = await this.profileRepository.save(
      this.profileRepository.create({
        userId: user.id,
        nick_name: `کاربر ${user.id}`,
      }),
    );
    await this.userRepository.update(
      { id: user.id },
      { profileId: profile.id },
    );
    const otp = await this.saveOtp(user.id, method);
    const token = this.tokenService.createOtpToken({ userId: user.id });
    return {
      token,
      code: otp.code,
    };
  }
  sendResponse(res: Response, result: AuthResponse) {
    const { code, token } = result;
    res.cookie(CookieKeys.OTP, token, CookiesOptionsToken());
    res.json({
      message: PublicMessage.SendOtp,
      code,
    });
  }

  /**
   * B4 — atomic OTP request rate limiting (max 3 per 10 minutes per destination).
   *
   * Runs a single conditional UPDATE: the row is incremented only when the
   * current window has fewer than the max requests. If no row is updated the
   * limit has been reached and 429 is thrown. Race-safe without Redis: the
   * check-and-increment happens in one SQL statement on the database.
   * `userId` derives from the validated/normalized destination resolved by the
   * login/register flow — client-supplied identifiers are never trusted.
   *
   * A brand-new user has no OTP row yet; the row is created first with
   * requestCount = 1 (first request always allowed).
   */
  private async enforceOtpRequestLimit(userId: number): Promise<void> {
    const windowStart = new Date(Date.now() - OTP_REQUEST_WINDOW_MS);

    // Reset the counter when the previous window has passed.
    await this.OtpRepository.createQueryBuilder()
      .update(OtpEntity)
      .set({ requestCount: 0, createdAt: () => 'NOW()' })
      .where('userId = :userId AND "createdAt" < :windowStart', {
        userId,
        windowStart,
      })
      .execute();

    // For a brand-new user there is no row: insert with requestCount = 1.
    const existing = await this.OtpRepository.findOneBy({ userId });
    if (!existing) {
      await this.OtpRepository.insert({
        userId,
        code: '',
        expiresIn: new Date(0),
        requestCount: 1,
        failedAttempts: 0,
        consumedAt: null,
      });
      return;
    }

    // Atomic conditional increment: only increments while count < max.
    const result = await this.dataSource
      .createQueryBuilder()
      .update(OtpEntity)
      .set({
        requestCount: () => '"requestCount" + 1',
        createdAt: () => 'NOW()',
      })
      .where('userId = :userId AND "requestCount" < :max', {
        userId,
        max: OTP_MAX_REQUESTS_PER_WINDOW,
      })
      .execute();

    if (!result.affected) {
      throw new HttpException(
        RateLimitMessage.TooManyOtpRequests,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async saveOtp(userId: number, method: AuthMethod) {
    // B4: destination-based OTP request limit (atomic; throws 429 on breach)
    await this.enforceOtpRequestLimit(userId);

    const code = randomInt(10000, 99999).toString();
    const expiresIn = new Date(Date.now() + 1000 * 60 * 2);
    let otp = await this.OtpRepository.findOneBy({ userId });
    let existOtp = false;
    if (otp) {
      existOtp = true;
      // B4: issuing a new OTP invalidates the previous one and gives a fresh
      // verification-attempt state (old code can no longer verify).
      otp.code = code;
      otp.expiresIn = expiresIn;
      otp.method = method;
      otp.failedAttempts = 0;
      otp.consumedAt = null;
    } else {
      otp = this.OtpRepository.create({
        code,
        expiresIn,
        userId,
        method,
        failedAttempts: 0,
        consumedAt: null,
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

  /**
   * B4 — atomic failed-attempt tracking for OTP verification.
   * Increment failedAttempts; at OTP_MAX_FAILED_ATTEMPTS the OTP is invalidated
   * (expired) so further attempts — even with the correct code — fail.
   * Returns true when the attempt limit has just been reached/exceeded.
   */
  private async recordFailedOtpAttempt(otpId: number): Promise<boolean> {
    await this.OtpRepository.createQueryBuilder()
      .update(OtpEntity)
      .set({ failedAttempts: () => '"failedAttempts" + 1' })
      .where('id = :otpId', { otpId })
      .execute();

    const otp = await this.OtpRepository.findOneBy({ id: otpId });
    if (otp && otp.failedAttempts >= OTP_MAX_FAILED_ATTEMPTS) {
      // Invalidate: expire the OTP now. A correct code will no longer verify.
      await this.OtpRepository.update(
        { id: otpId },
        { expiresIn: new Date(Date.now() - 1000) },
      );
      return true;
    }
    return false;
  }

  async checkOtp(code: string) {
    const token = this.request.cookies[CookieKeys.OTP] as string;
    if (!token) throw new UnauthorizedException(AuthMessage.ExiredCode);
    const { userId } = this.tokenService.verifyOtpToken(token);
    const otp = await this.OtpRepository.findOneBy({ userId });
    if (!otp) throw new UnauthorizedException(AuthMessage.LoginAgin);
    const now = new Date();
    if (otp.expiresIn < now)
      throw new UnauthorizedException(AuthMessage.ExiredCode);
    // B4: an already-consumed OTP cannot be replayed
    if (otp.consumedAt) throw new UnauthorizedException(AuthMessage.ExiredCode);
    if (otp.code !== code) {
      const invalidated = await this.recordFailedOtpAttempt(otp.id);
      if (invalidated)
        throw new UnauthorizedException(RateLimitMessage.TooManyAttempts);
      throw new UnauthorizedException(AuthMessage.TryAgain);
    }
    // B4: consume the OTP (one-time use) and reset abuse counters
    await this.OtpRepository.update(
      { id: otp.id },
      { consumedAt: new Date(), failedAttempts: 0 },
    );
    const accessToken = this.tokenService.createAccessToken({ userId });
    if (otp.method === AuthMethod.Emai) {
      await this.userRepository.update(
        { id: userId },
        {
          verify_email: true,
        },
      );
    } else if (otp.method === AuthMethod.phone) {
      await this.userRepository.update(
        { id: userId },
        {
          verify_phone: true,
        },
      );
    }
    return {
      message: PublicMessage.LoggedIn,
      accessToken,
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

  async validateAccessToken(token: string) {
    const { userId } = this.tokenService.verifyAccessToken(token);
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException(AuthMessage.LoginAgin);
    return user;
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

  async googleAuth(userData: GoogleUser) {
    const { email, firstName, lastName } = userData;
    let token: string;
    let user = await this.userRepository.findOneBy({ email });
    if (user) {
      token = this.tokenService.createAccessToken({ userId: user.id });
    } else {
      user = this.userRepository.create({
        email,
        verify_email: true,
        username: email.split('@')['0'] + randomId(),
      });
      user = await this.userRepository.save(user);
      let profile = this.profileRepository.create({
        userId: user.id,
        nick_name: `${firstName} ${lastName}`,
      });
      profile = await this.profileRepository.save(profile);
      user.profileId = profile.id;
      await this.userRepository.save(user);
      token = this.tokenService.createAccessToken({ userId: user.id });
    }
    return {
      token,
    };
  }
}
