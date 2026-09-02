import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { ProfileDto } from './dto/profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { isDate } from 'class-validator';
import { Gender } from './enums/gender.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AuthMessage,
  BadRequestMessage,
  ConflictMessage,
  NotFoundMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { ProfileImages } from './types/files';
import { AuthService } from '../auth/auth.service';
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

interface ProfileRaw {
  followersCount: string;
  followingCount: string;
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
  ) {}

  async changeProfile(files: ProfileImages, profileDto: ProfileDto) {
    if (files?.image_profile?.length > 0) {
      let [image] = files?.image_profile;
      profileDto.image_profile = image?.path?.slice(7);
    }
    if (files?.bg_image?.length > 0) {
      let [image] = files?.bg_image;
      profileDto.bg_image = image?.path?.slice(7);
    }
    const { id: userId, profileId } = this.request.user;
    let profile = await this.profileRepository.findOneBy({ userId });
    const {
      bio,
      birthday,
      gender,
      linkedin_profile,
      nick_name,
      x_profile,
      image_profile,
      bg_image,
    } = profileDto;
    if (profile) {
      if (nick_name) profile.nick_name = nick_name;
      if (bio) profile.bio = bio;
      if (birthday && isDate(new Date(birthday)))
        profile.birthday = new Date(birthday);
      if (gender && Object.values(Gender as any).includes(gender))
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

  find() {
    return this.userRepository.find({
      where: {},
    });
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

  async changeEmail(email: string) {
    const { id } = this.request.user;
    const user = await this.userRepository.findOneBy({ email });
    if (user && user?.id !== id) {
      throw new ConflictException(ConflictMessage.Email);
    } else if (user && user.id == id) {
      return {
        message: PublicMessage.Updated,
      };
    }
    await this.userRepository.update({ id }, { new_email: email });
    const otp = await this.authService.saveOtp(id, AuthMethod.Emai);
    const token = this.tokenService.createEmailToken({ email });
    return {
      code: otp.code,
      token,
    };
  }

  // async changeEmail(email: string) {
  //   const { id } = this.request.user;

  //   const existUser = await this.userRepository.findOneBy({ email });

  //   if (existUser && existUser.id !== id) {
  //     throw new ConflictException(ConflictMessage.Email);
  //   }

  //   if (existUser && existUser.id === id) {
  //     return {
  //       message: PublicMessage.Updated,
  //     };
  //   }

  //   await this.userRepository.update(
  //     { id },
  //     {
  //       new_email: email,
  //     },
  //   );

  //   const otp = await this.authService.saveOtp(id);

  //   const token = this.tokenService.createEmailToken({ email });

  //   return {
  //     code: otp.code,
  //     token,
  //   };
  // }

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

  async changePhone(phone: string) {
    const { id } = this.request.user;
    const user = await this.userRepository.findOneBy({ phone });
    if (user && user?.id !== id) {
      throw new ConflictException(ConflictMessage.Phone);
    } else if (user && user.id == id) {
      return {
        message: PublicMessage.Updated,
      };
    }
    await this.userRepository.update({ id }, { new_Phone: phone });
    const otp = await this.authService.saveOtp(id, AuthMethod.phone);
    const token = this.tokenService.createPhoneToken({ phone });
    return {
      code: otp.code,
      token,
    };
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
  async checkotp(userId: number, code: string) {
    const otp = await this.OtpRepository.findOneBy({ userId });
    if (!otp) throw new BadRequestException(NotFoundMessage.NotFound);
    const now = new Date();
    if (otp.expiresIn < now)
      throw new BadRequestException(AuthMessage.ExiredCode);
    if (otp.code !== code) throw new BadRequestException(AuthMessage.TryAgain);
    return otp;
  }

  async followToggle(followingId: number) {
    const { id: userId } = this.request.user;
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
    }
    return {
      message,
    };
  }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
