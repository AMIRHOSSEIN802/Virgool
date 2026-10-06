import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  OtpDeliveryError,
  PublicMessage,
  RateLimitMessage,
} from 'src/common/enums/message.enum';
import { randomBytes, randomInt } from 'crypto';
import { OtpEntity } from '../user/entities/otp.entity';
import { TokensService } from './tokens.service';
import { CookieKeys } from 'src/common/enums/cookie.enum';
import type { Request, Response } from 'express';
import { AuthResponse, GoogleUser } from './types/response';
import { REQUEST } from '@nestjs/core';
import {
  ClearCookiesOptionsRefresh,
  CookiesOptionsRefresh,
  CookiesOptionsToken,
} from 'src/common/utils/cookie.util';
import { randomId } from 'src/common/utils/functions.util';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OtpDeliveryService } from '../otp-delivery/otp-delivery.service';
import type { OtpDeliveryMessage } from '../otp-delivery/otp-delivery.types';
import { SessionService, SessionMeta } from './session.service';
import { OAuthCodeEntity } from './entities/oauth-code.entity';
import { UserStatus } from '../user/enums/status.enum';

/** OTP abuse-protection policy (B4) */
export const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_REQUESTS_PER_WINDOW = 3;
export const OTP_MAX_FAILED_ATTEMPTS = 5;
/** R-05 — how long the Google OAuth one-time handoff code stays spendable. */
export const GOOGLE_HANDOFF_TTL_MS = 60 * 1000;

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(OtpEntity)
    private readonly OtpRepository: Repository<OtpEntity>,
    @InjectRepository(OAuthCodeEntity)
    private readonly OAuthCodeRepository: Repository<OAuthCodeEntity>,
    @Inject(REQUEST) private request: Request,
    private tokenService: TokensService,
    private readonly sessionService: SessionService,
    private dataSource: DataSource,
    private readonly otpDelivery: OtpDeliveryService,
  ) {}

  async userExistence(authDto: AuthDto, res: Response) {
    const { method, type, username } = authDto;
    let result: AuthResponse;
    switch (type) {
      case AuthType.Login:
        result = await this.login(method, username);
        return this.sendResponse(res, result);
      case AuthType.Register:
        result = await this.register(method, username);
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
    // Security: the code leaves the server only through the delivery
    // transport — never in the HTTP response, never in an application log.
    await this.deliverOtp(method, validUsername, user, otp.code);

    return { token };
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
    await this.deliverOtp(method, validUsername, user, otp.code);
    return { token };
  }

  /**
   * Hands the OTP to the out-of-band delivery provider. This is the only
   * path a code may take out of the server — it is never returned in a
   * response body and never written to a log by application code.
   */
  private async deliverOtp(
    method: AuthMethod,
    destination: string,
    user: UserEntity,
    code: string,
  ): Promise<void> {
    let channel: OtpDeliveryMessage['channel'];
    let to: string;
    switch (method) {
      case AuthMethod.Emai:
        channel = 'email';
        to = destination;
        break;
      case AuthMethod.phone:
        channel = 'sms';
        to = destination;
        break;
      case AuthMethod.Username:
        // Username logins have no explicit destination — fall back to the
        // contact data on the account (phone first, then email).
        if (user.phone) {
          channel = 'sms';
          to = user.phone;
        } else if (user.email) {
          channel = 'email';
          to = user.email;
        } else {
          throw new BadRequestException(OtpDeliveryError.NoDestination);
        }
        break;
      default:
        throw new UnauthorizedException();
    }
    await this.otpDelivery.send({ channel, to, code });
  }

  sendResponse(res: Response, result: AuthResponse) {
    res.cookie(CookieKeys.OTP, result.token, CookiesOptionsToken());
    // Security: the response carries only the success message. The OTP code
    // must never appear here (or anywhere else outside the transport).
    res.json({
      message: PublicMessage.SendOtp,
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
  async recordFailedOtpAttempt(otpId: number): Promise<boolean> {
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

  async checkOtp(code: string, res: Response) {
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
    // B4: consume the OTP (one-time use) and reset abuse counters.
    // Conditional UPDATE — only one concurrent verify can win the race, so
    // the same code can never be exchanged for two access tokens.
    const consumed = await this.OtpRepository.createQueryBuilder()
      .update(OtpEntity)
      .set({ consumedAt: () => 'NOW()', failedAttempts: 0 })
      .where('id = :id AND "consumedAt" IS NULL', { id: otp.id })
      .execute();
    if (!consumed.affected) {
      throw new UnauthorizedException(AuthMessage.ExiredCode);
    }
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
    // R-05: a successful OTP verification also opens a refresh session. The
    // raw refresh token goes ONLY into the HttpOnly cookie — the JSON body
    // keeps the established { message, accessToken } contract.
    const { raw } = await this.sessionService.createSession(
      userId,
      this.sessionMeta(),
    );
    res.cookie(CookieKeys.Refresh, raw, CookiesOptionsRefresh());
    return {
      message: PublicMessage.LoggedIn,
      accessToken,
    };
  }

  /**
   * R-05 — POST /auth/refresh: rotate the cookie-scoped refresh token into a
   * fresh access token + fresh refresh cookie. Never requires (and never
   * accepts as sufficient) an access token; never returns the refresh token
   * in the body. Every failure clears the cookie; reuse of a rotated token
   * revokes the whole family inside SessionService.
   */
  async refreshSession(res: Response) {
    const raw = this.request.cookies[CookieKeys.Refresh] as string | undefined;
    if (!raw) throw new UnauthorizedException(AuthMessage.LoginIsRequired);
    try {
      const { raw: nextRaw, session } = await this.sessionService.rotateSession(
        raw,
        this.sessionMeta(),
      );
      const accessToken = this.tokenService.createAccessToken({
        userId: session.userId,
      });
      res.cookie(CookieKeys.Refresh, nextRaw, CookiesOptionsRefresh());
      return { accessToken };
    } catch (error) {
      res.clearCookie(CookieKeys.Refresh, ClearCookiesOptionsRefresh());
      throw error;
    }
  }

  /**
   * R-05 — POST /auth/logout: revoke the session family behind the cookie and
   * clear the cookie. Idempotent: no cookie / unknown cookie is still a
   * successful logout, and the caller can only ever touch their OWN session
   * (possession of the opaque token is the capability).
   */
  async logout(res: Response) {
    const raw = this.request.cookies[CookieKeys.Refresh] as string | undefined;
    if (raw) await this.sessionService.revokeByRawToken(raw);
    res.clearCookie(CookieKeys.Refresh, ClearCookiesOptionsRefresh());
    return { message: PublicMessage.LoggedOut };
  }

  private sessionMeta(): SessionMeta {
    return {
      userAgent: this.request.headers['user-agent'] ?? null,
      ip: this.request.ip ?? null,
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

  /**
   * R-05 — Google OAuth handshake step 1. Finds/creates the user exactly as
   * before, but instead of signing a JWT that would travel through the
   * browser URL, it mints a random ONE-TIME handoff code (~60s, stored
   * hashed, single-use) that the frontend exchanges for real tokens.
   */
  async googleAuth(userData: GoogleUser): Promise<{ code: string }> {
    const { email, firstName, lastName } = userData;
    let user = await this.userRepository.findOneBy({ email });
    if (!user) {
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
    }
    const code = await this.createGoogleCode(user.id);
    return { code };
  }

  /** R-05 — stores the SHA-256 of a fresh one-time handoff code. */
  private async createGoogleCode(userId: number): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    // Bounded cleanup of spent/expired handoff rows.
    await this.OAuthCodeRepository.createQueryBuilder()
      .delete()
      .where('"expiresAt" < NOW()')
      .execute();
    await this.OAuthCodeRepository.save(
      this.OAuthCodeRepository.create({
        userId,
        codeHash: SessionService.hashToken(raw),
        expiresAt: new Date(Date.now() + GOOGLE_HANDOFF_TTL_MS),
        consumedAt: null,
      }),
    );
    return raw;
  }

  /**
   * R-05 — POST /auth/google/exchange: spends a one-time handoff code for an
   * access token + refresh cookie. The claim is a single conditional UPDATE,
   * so a code can be exchanged exactly once even under concurrent requests;
   * expired/used/unknown codes all fail with 401.
   */
  async exchangeGoogleCode(code: string, res: Response) {
    const hash = SessionService.hashToken(code);
    const claimed = await this.OAuthCodeRepository.createQueryBuilder()
      .update(OAuthCodeEntity)
      .set({ consumedAt: () => 'NOW()' })
      .where(
        '"codeHash" = :hash AND "consumedAt" IS NULL AND "expiresAt" > NOW()',
        { hash },
      )
      .execute();
    if (!claimed.affected)
      throw new UnauthorizedException(AuthMessage.ExiredCode);
    const handoff = await this.OAuthCodeRepository.findOneBy({
      codeHash: hash,
    });
    if (!handoff) throw new UnauthorizedException(AuthMessage.ExiredCode);
    const user = await this.userRepository.findOneBy({ id: handoff.userId });
    if (!user) throw new UnauthorizedException(AuthMessage.LoginAgin);
    if (user.status === UserStatus.Block) {
      throw new ForbiddenException(AuthMessage.Blocked);
    }
    const accessToken = this.tokenService.createAccessToken({
      userId: user.id,
    });
    const { raw } = await this.sessionService.createSession(
      user.id,
      this.sessionMeta(),
    );
    res.cookie(CookieKeys.Refresh, raw, CookiesOptionsRefresh());
    return {
      message: PublicMessage.LoggedIn,
      accessToken,
    };
  }
}
