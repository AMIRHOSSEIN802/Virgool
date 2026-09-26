import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { ProfileDto } from './dto/profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { isDate } from 'class-validator';
import { Gender } from './enums/gender.enum';
import {
  AuthMessage,
  BadRequestMessage,
  ConflictMessage,
  NotFoundMessage,
  PublicMessage,
  RateLimitMessage,
} from 'src/common/enums/message.enum';
import { ProfileImages } from './types/files';
import { AuthService } from '../auth/auth.service';
import { OtpDeliveryService } from '../otp-delivery/otp-delivery.service';
import { TokensService } from '../auth/tokens.service';
import { CookieKeys } from 'src/common/enums/cookie.enum';
import { OtpEntity } from './entities/otp.entity';
import { AuthMethod } from '../auth/enums/method.enums';
import { FollowEntity } from './entities/follow.entity';
import {
  paginationGenerator,
  paginationSolver,
} from 'src/common/utils/pagination.util';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { UserBlockDto } from '../auth/dto/auth.dto';
import { UserStatus } from './enums/status.enum';
import { Roles } from 'src/common/enums/role.eunm';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/type.enum';
import { AdminUserFilterDto } from './dto/admin-users.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ImageEntity } from '../image/entities/image.entity';
import { BlogEntity } from '../blog/entities/blog.entity';
import { join, resolve, sep } from 'path';
import { unlink } from 'fs/promises';

interface ProfileRaw {
  followersCount: string;
  followingCount: string;
}

/**
 * Result of change-email / change-phone. When `otpRequired` is true the
 * caller must show the OTP verification step — the code itself was delivered
 * out-of-band and is NEVER part of the HTTP response.
 */
export interface ChangeContactOtpResult {
  otpRequired: boolean;
  message?: string;
  token?: string;
}
@Injectable({ scope: Scope.REQUEST })
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private profileRepository: Repository<ProfileEntity>,
    @InjectRepository(FollowEntity)
    private followRepository: Repository<FollowEntity>,
    @Inject(REQUEST) private request: Request,
    private authService: AuthService,
    private tokenService: TokensService,
    @InjectRepository(OtpEntity)
    private readonly OtpRepository: Repository<OtpEntity>,
    private notificationService: NotificationService,
    private dataSource: DataSource,
    private readonly otpDelivery: OtpDeliveryService,
  ) {}

  async changeProfile(files: ProfileImages, profileDto: ProfileDto) {
    if (files?.image_profile?.length > 0) {
      const [image] = files?.image_profile;
      profileDto.image_profile = image?.path?.slice(7);
    }
    if (files?.bg_image?.length > 0) {
      const [image] = files?.bg_image;
      profileDto.bg_image = image?.path?.slice(7);
    }
    const { id: userId, profileId } = this.request.user;
    let profile = await this.profileRepository.findOneBy({ userId });
    const { bio, birthday, gender, linkedin_profile, nick_name, x_profile } =
      profileDto;
    // Multipart JSON serialization (axios formDataToJSON) can deliver these
    // fields as `{}` — only accept real string paths so a bogus body can never
    // overwrite a stored image path.
    const image_profile =
      typeof profileDto.image_profile === 'string'
        ? profileDto.image_profile
        : '';
    const bg_image =
      typeof profileDto.bg_image === 'string' ? profileDto.bg_image : '';
    if (profile) {
      if (nick_name) profile.nick_name = nick_name;
      if (bio) profile.bio = bio;
      if (birthday && isDate(new Date(birthday)))
        profile.birthday = new Date(birthday);
      if (gender && Object.values(Gender).includes(gender as Gender))
        profile.gender = gender;
      if (linkedin_profile) profile.linkedin_profile = linkedin_profile;
      if (x_profile) profile.x_profile = x_profile;
      if (image_profile) profile.image_profile = image_profile;
      if (bg_image) profile.bg_image = bg_image;
    } else {
      profile = this.profileRepository.create({
        nick_name,
        bio,
        birthday,
        gender,
        linkedin_profile,
        x_profile,
        userId,
        image_profile,
        bg_image,
      });
    }
    profile = await this.profileRepository.save(profile);
    if (!profileId) {
      await this.userRepository.update(
        { id: userId },
        { profileId: profile.id },
      );
    }
    return {
      message: PublicMessage.Updated,
    };
  }

  /**
   * Admin user directory: paginated, searchable (username/nickname/email/
   * phone), role-filterable. Only non-sensitive columns are selected — the
   * password hash is NEVER part of this payload.
   */
  async adminUsers(paginationDto: PaginationDto, filter: AdminUserFilterDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const { search, role } = filter;

    // select() REPLACES the selection, so it must come BEFORE addSelect() —
    // only whitelisted columns (no password/otpId/tokens), plus the profile
    // columns the admin list displays.
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.profile', 'profile')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.phone',
        'user.role',
        'user.status',
        'user.created_at',
      ])
      // profile.id must be selected for TypeORM to attach the relation object
      .addSelect(['profile.id', 'profile.nick_name', 'profile.image_profile']);

    if (role === Roles.Admin || role === Roles.User) {
      qb.andWhere('user.role = :role', { role });
    }
    if (search) {
      const term = String(search).trim();
      if (term) {
        const escaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
        qb.andWhere(
          '(user.username ILIKE :search OR profile.nick_name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
          { search: `%${escaped}%` },
        );
      }
    }

    const [users, count] = await qb
      .orderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      pagination: paginationGenerator(count, page, limit),
      users,
    };
  }

  async followers(paginationDto: PaginationDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const { id: userId } = this.request.user;

    const [followers, count] = await this.followRepository.findAndCount({
      where: {
        followingId: userId,
      },
      relations: {
        follower: {
          profile: true,
        },
      },
      select: {
        id: true,
        follower: {
          id: true,
          username: true,
          profile: {
            id: true,
            nick_name: true,
            bio: true,
            image_profile: true,
            bg_image: true,
          },
        },
      },
      skip,
      take: limit,
    });

    return {
      pagination: paginationGenerator(count, page, limit),
      followers,
    };
  }

  async following(paginationDto: PaginationDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const { id: userId } = this.request.user;

    const [following, count] = await this.followRepository.findAndCount({
      where: {
        followerId: userId,
      },
      relations: {
        following: {
          profile: true,
        },
      },
      select: {
        id: true,
        following: {
          id: true,
          username: true,
          profile: {
            id: true,
            nick_name: true,
            bio: true,
            image_profile: true,
            bg_image: true,
          },
        },
      },
      skip,
      take: limit,
    });

    return {
      pagination: paginationGenerator(count, page, limit),
      following,
    };
  }

  async profile() {
    const { id } = this.request.user;

    const result = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(*)')
          .from(FollowEntity, 'follow')
          .where('follow.followingId = user.id');
      }, 'followersCount')
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(*)')
          .from(FollowEntity, 'follow')
          .where('follow.followerId = user.id');
      }, 'followingCount')
      .where('user.id = :id', { id })
      .getRawAndEntities<ProfileRaw>();

    const user = result.entities[0];
    const raw = result.raw[0];

    if (!user || !raw) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      followersCount: Number(raw.followersCount),
      followingCount: Number(raw.followingCount),
    };
  }

  async changeEmail(email: string): Promise<ChangeContactOtpResult> {
    const { id } = this.request.user;
    const user = await this.userRepository.findOneBy({ email });
    if (user && user?.id !== id) {
      throw new ConflictException(ConflictMessage.Email);
    } else if (user && user.id == id) {
      return {
        otpRequired: false,
        message: PublicMessage.Updated,
      };
    }
    await this.userRepository.update({ id }, { new_email: email });
    const otp = await this.authService.saveOtp(id, AuthMethod.Emai);
    const token = this.tokenService.createEmailToken({ email });
    // R-14: deliver to the NEW address (proof of possession). The code is
    // handed only to the delivery transport — never returned in the response.
    await this.otpDelivery.send({
      channel: 'email',
      to: email,
      code: otp.code,
    });
    return { otpRequired: true, token };
  }

  async verifyEmail(code: string) {
    const { id: userId, new_email } = this.request.user;
    const token = this.request.cookies[CookieKeys.EmailOTP] as string;
    if (!token) throw new BadRequestException(AuthMessage.ExiredCode);
    const { email } = this.tokenService.verifyEmailToken(token);
    if (email !== new_email)
      throw new BadRequestException(BadRequestMessage.SomthingWrong);
    const otp = await this.checkotp(userId, code);
    if (otp.method !== AuthMethod.Emai) {
      throw new BadRequestException(BadRequestMessage.SomthingWrong);
    }
    await this.userRepository.update(
      { id: userId },
      {
        email,
        verify_email: true,
        new_email: null,
      },
    );
    return {
      message: PublicMessage.Updated,
    };
  }

  async changePhone(phone: string): Promise<ChangeContactOtpResult> {
    const { id } = this.request.user;
    const user = await this.userRepository.findOneBy({ phone });
    if (user && user?.id !== id) {
      throw new ConflictException(ConflictMessage.Phone);
    } else if (user && user.id == id) {
      return {
        otpRequired: false,
        message: PublicMessage.Updated,
      };
    }
    await this.userRepository.update({ id }, { new_Phone: phone });
    const otp = await this.authService.saveOtp(id, AuthMethod.phone);
    const token = this.tokenService.createPhoneToken({ phone });
    // R-14: deliver to the NEW number — proof of possession; no code in body.
    await this.otpDelivery.send({ channel: 'sms', to: phone, code: otp.code });
    return { otpRequired: true, token };
  }

  async verifyPhone(code: string) {
    const { id: userId, new_Phone } = this.request.user;
    const token = this.request.cookies[CookieKeys.PhoneOTP] as string;
    if (!token) throw new BadRequestException(AuthMessage.ExiredCode);
    const { phone } = this.tokenService.verifyPhoneToken(token);
    if (phone !== new_Phone)
      throw new BadRequestException(BadRequestMessage.SomthingWrong);
    const otp = await this.checkotp(userId, code);
    if (otp.method !== AuthMethod.phone) {
      throw new BadRequestException(BadRequestMessage.SomthingWrong);
    }
    await this.userRepository.update(
      { id: userId },
      {
        phone,
        verify_phone: true,
        new_Phone: null,
      },
    );
    return {
      message: PublicMessage.Updated,
    };
  }

  async changeUserna(username: string) {
    const { id } = this.request.user;
    const user = await this.userRepository.findOneBy({ username });
    if (user && user?.id !== id) {
      throw new ConflictException(ConflictMessage.username);
    } else if (user && user.id == id) {
      return {
        message: PublicMessage.Updated,
      };
    }
    await this.userRepository.update({ id }, { username });
    return {
      message: PublicMessage.Updated,
    };
  }
  /**
   * OTP verification for change-email / change-phone — hardened to the same
   * standard as AuthService.checkOtp (B4 + R-14):
   * - expiry check,
   * - consumed OTP cannot be replayed,
   * - wrong codes are counted and the code is invalidated after 5 failures,
   * - consumption is an atomic conditional UPDATE (race-safe),
   * - request rate limiting already applies upstream via AuthService.saveOtp.
   */
  async checkotp(userId: number, code: string) {
    const otp = await this.OtpRepository.findOneBy({ userId });
    if (!otp) throw new BadRequestException(NotFoundMessage.NotFound);
    const now = new Date();
    if (otp.expiresIn < now)
      throw new BadRequestException(AuthMessage.ExiredCode);
    // R-14: an already-consumed OTP cannot be replayed.
    if (otp.consumedAt) throw new BadRequestException(AuthMessage.ExiredCode);
    if (otp.code !== code) {
      const invalidated = await this.authService.recordFailedOtpAttempt(otp.id);
      if (invalidated)
        throw new BadRequestException(RateLimitMessage.TooManyAttempts);
      throw new BadRequestException(AuthMessage.TryAgain);
    }
    // R-14: atomic one-time consumption — a concurrent duplicate verify
    // loses the UPDATE race and is rejected.
    const consumed = await this.OtpRepository.createQueryBuilder()
      .update(OtpEntity)
      .set({ consumedAt: () => 'NOW()', failedAttempts: 0 })
      .where('id = :id AND "consumedAt" IS NULL', { id: otp.id })
      .execute();
    if (!consumed.affected)
      throw new BadRequestException(AuthMessage.ExiredCode);
    return otp;
  }

  /**
   * Public author profile by username.
   * Works for guests (no user in request) and authenticated users.
   * Returns only public data + follow stats + viewer's follow state.
   * Single round-trip per dataset (no N+1): counts via sub-queries.
   */
  async publicProfileByUsername(username: string) {
    const viewer = (this.request as Request & { user?: UserEntity }).user;
    const viewerId = viewer?.id;

    const profile = await this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .addSelect((sub) => {
        return sub
          .select('COUNT(*)')
          .from(FollowEntity, 'follow')
          .where('follow.followingId = user.id');
      }, 'followersCount')
      .addSelect((sub) => {
        return sub
          .select('COUNT(*)')
          .from(FollowEntity, 'follow')
          .where('follow.followerId = user.id');
      }, 'followingCount')
      .where('user.username = :username', { username })
      .getRawAndEntities<{
        followersCount: string;
        followingCount: string;
        isFollowing?: number;
      }>();

    const entity = profile.entities[0];
    const raw = profile.raw[0];
    if (!entity || !raw || !entity.user) {
      throw new NotFoundException(NotFoundMessage.NotFoundUser);
    }

    // Viewer's follow state (only when authenticated, single indexed query).
    let isFollowing = false;
    if (viewerId) {
      isFollowing = !!(await this.followRepository.findOneBy({
        followingId: entity.user.id,
        followerId: viewerId,
      }));
    }

    return {
      id: entity.user.id,
      username: entity.user.username,
      role: entity.user.role,
      profile: {
        nick_name: entity.nick_name,
        bio: entity.bio,
        image_profile: entity.image_profile,
        bg_image: entity.bg_image,
      },
      followersCount: Number(raw.followersCount),
      followingCount: Number(raw.followingCount),
      isFollowing,
    };
  }

  async followToggle(followingId: number) {
    const { id: userId } = this.request.user;
    if (followingId === userId) {
      throw new BadRequestException(BadRequestMessage.cannotfollow);
    }
    const following = await this.userRepository.findOneBy({ id: followingId });
    if (!following) throw new NotFoundException(NotFoundMessage.NotFoundUser);
    const isFollowing = await this.followRepository.findOneBy({
      followingId,
      followerId: userId,
    });
    let message = PublicMessage.Followed;
    if (isFollowing) {
      message = PublicMessage.UnFollow;
      await this.followRepository.remove(isFollowing);
    } else {
      await this.followRepository.insert({ followingId, followerId: userId });
      // Notify the followed user only after the follow actually succeeded.
      // followToggle cannot produce a duplicate follow (findOne guard above),
      // and the notification's unread-dedup covers re-follow spam.
      try {
        await this.notificationService.push({
          type: NotificationType.Follow,
          recipientId: followingId,
          actorId: userId,
        });
      } catch {
        // notification failure must never fail the business action
      }
    }
    return {
      message,
    };
  }
  async blockToggle(blockDto: UserBlockDto) {
    const { userId } = blockDto;
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(NotFoundMessage.NotFoundUser);
    let message = PublicMessage.Blocked;
    if (user.status === UserStatus.Block) {
      message = PublicMessage.UnBlocked;
      await this.userRepository.update(
        { id: userId },
        { status: UserStatus.Active },
      );
    } else {
      await this.userRepository.update(
        { id: userId },
        { status: UserStatus.Block },
      );
    }
    return {
      message,
    };
  }

  /**
   * DELETE /user/account — hard-delete the AUTHENTICATED account only.
   *
   * Security: the target id is taken exclusively from req.user; the body holds
   * nothing but the username confirmation, so body/query/path manipulation can
   * never reach another account (no IDOR, no admin delete-others route).
   *
   * Ordering inside one transaction: validate → collect file paths → delete
   * the user row → delete profile/otp. The user row must go first because
   * user.profileId → profile and user.otpId → otp are NO ACTION foreign keys
   * (removing the referencing row is what makes those deletes legal), while
   * profile.userId / otp.userId have no FK back to user at all and would
   * otherwise be orphaned. Everything else (blogs, comments, replies, likes,
   * bookmarks, follows, images, received notifications) is removed by the
   * PostgreSQL ON DELETE CASCADE rules that already exist — no cascade logic
   * is reimplemented here. Notifications where this user was only the actor
   * belong to someone else and survive with actorId set to NULL (SET NULL).
   *
   * Filesystem cleanup runs strictly AFTER the commit and is best-effort: a
   * failed unlink never rolls back or fails the deletion and never leaks
   * filesystem details to the client.
   */
  async deleteAccount(deleteAccountDto: DeleteAccountDto) {
    const me = this.request.user;
    if (!me?.id) throw new UnauthorizedException(AuthMessage.LoginIsRequired);

    const filesToDelete = await this.dataSource.transaction(async (manager) => {
      // 1) load the real row (source of truth for identity/role/status)
      const user = await manager.findOne(UserEntity, {
        where: { id: me.id },
      });
      if (!user) throw new NotFoundException(NotFoundMessage.NotFoundUser);

      // 2) username confirmation — compared against the DB row, not the
      //    token payload and not anything else the client could influence.
      if (!user.username || deleteAccountDto.username !== user.username) {
        throw new BadRequestException(
          BadRequestMessage.InvalidUsernameConfirmation,
        );
      }

      // 3) never let the platform end up with zero administrators
      if (user.role === Roles.Admin) {
        const adminCount = await manager.count(UserEntity, {
          where: { role: Roles.Admin },
        });
        if (adminCount <= 1) {
          throw new ConflictException(ConflictMessage.LastAdmin);
        }
      }

      // 4) collect paths while the rows still exist
      const paths = await this.collectOwnedFilePaths(manager, user.id);

      // 5) database deletion (single atomic transaction)
      await manager.delete(UserEntity, { id: user.id });
      await manager.delete(ProfileEntity, { userId: user.id });
      await manager.delete(OtpEntity, { userId: user.id });

      return paths;
    });

    // 6) after a successful commit only — never before
    await this.removeFilesBestEffort(filesToDelete);

    return { message: PublicMessage.AccountDeleted };
  }

  /** Normalized stored path (uploads are stored with the platform separator). */
  private normalizeStoredPath(value?: string | null): string {
    return (value ?? '').trim().replace(/\\/g, '/');
  }

  /**
   * Files owned by this user: profile avatar/cover + editor upload rows.
   * A path is skipped when any OTHER row (someone else's profile/image, or a
   * blog cover) still points at it, and duplicates are removed.
   */
  private async collectOwnedFilePaths(
    manager: EntityManager,
    userId: number,
  ): Promise<string[]> {
    const candidates = new Set<string>();
    const add = (value?: string | null) => {
      const path = this.normalizeStoredPath(value);
      if (path) candidates.add(path);
    };

    const profile = await manager.findOne(ProfileEntity, { where: { userId } });
    add(profile?.image_profile);
    add(profile?.bg_image);

    // Raw select: ImageEntity has an @AfterLoad hook that rewrites `location`
    // into a URL, which must not be used as a filesystem path.
    const imageRows = await manager
      .getRepository(ImageEntity)
      .createQueryBuilder('image')
      .select('image.location', 'location')
      .where('image.userId = :userId', { userId })
      .getRawMany<{ location: string }>();
    imageRows.forEach((row) => add(row.location));

    if (candidates.size === 0) return [];

    const reserved = new Set<string>();
    const addReserved = (value?: string | null) => {
      const path = this.normalizeStoredPath(value);
      if (path) reserved.add(path);
    };

    const otherProfiles = await manager
      .getRepository(ProfileEntity)
      .createQueryBuilder('profile')
      .select('profile.image_profile', 'image_profile')
      .addSelect('profile.bg_image', 'bg_image')
      .where('profile.userId <> :userId', { userId })
      .getRawMany<{ image_profile: string | null; bg_image: string | null }>();
    otherProfiles.forEach((row) => {
      addReserved(row.image_profile);
      addReserved(row.bg_image);
    });

    const otherImages = await manager
      .getRepository(ImageEntity)
      .createQueryBuilder('image')
      .select('image.location', 'location')
      .where('image.userId <> :userId', { userId })
      .getRawMany<{ location: string }>();
    otherImages.forEach((row) => addReserved(row.location));

    const blogCovers = await manager
      .getRepository(BlogEntity)
      .createQueryBuilder('blog')
      .select('blog.image', 'image')
      .where("blog.image IS NOT NULL AND blog.image <> ''")
      .getRawMany<{ image: string }>();
    blogCovers.forEach((row) => addReserved(row.image));

    return [...candidates].filter((path) => !reserved.has(path));
  }

  /**
   * Best-effort removal of the collected files. Runs after the transaction
   * committed: a failure is logged server-side only and never fails (or
   * undoes) the account deletion. Paths are confined to public/.
   */
  private async removeFilesBestEffort(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const publicRoot = resolve(join(process.cwd(), 'public'));

    for (const relativePath of paths) {
      const resolved = resolve(join(publicRoot, relativePath));
      if (!resolved.startsWith(publicRoot + sep)) continue;
      try {
        await unlink(resolved);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') continue; // already gone — nothing to clean
        console.error(
          '[account-deletion] file cleanup failed:',
          relativePath,
          code ?? (error as Error).message,
        );
      }
    }
  }
}
