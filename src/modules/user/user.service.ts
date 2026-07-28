import { ConflictException, Inject, Injectable, Scope } from '@nestjs/common';
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
import { ConflictMessage, PublicMessage } from 'src/common/enums/message.enum';
import { ProfileImages } from './types/files';
import { AuthService } from '../auth/auth.service';
import { TokensService } from '../auth/tokens.service';

@Injectable({ scope: Scope.REQUEST })
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private profileRepository: Repository<ProfileEntity>,
    @Inject(REQUEST) private request: Request,
    private authService: AuthService,
    private tokenService: TokensService,
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

  profile() {
    const { id } = this.request.user;
    return this.userRepository.findOne({
      where: { id },
      relations: {
        profile: true,
      },
    });
  }

  // async changeEmail(email: string) {
  //   const { id } = this.request.user;
  //   const user = await this.userRepository.findOneBy({ email });
  //   if (user && user?.id !== id) {
  //     throw new ConflictException(ConflictMessage.Email);
  //   } else if (user && user.id == id) {
  //     return {
  //       message: PublicMessage.Updated,
  //     };
  //   }
  //   user.new_email = email;
  //   const otp = await this.authService.saveOtp(user?.id);
  //   const token = this.tokenService.createEmailToken({ email });
  //   return {
  //     code: otp.code,
  //     token,
  //   };
  // }

  async changeEmail(email: string) {
    const { id } = this.request.user;

    const existUser = await this.userRepository.findOneBy({ email });

    if (existUser && existUser.id !== id) {
      throw new ConflictException(ConflictMessage.Email);
    }

    if (existUser && existUser.id === id) {
      return {
        message: PublicMessage.Updated,
      };
    }

    await this.userRepository.update(
      { id },
      {
        new_email: email,
      },
    );

    const otp = await this.authService.saveOtp(id);

    const token = this.tokenService.createEmailToken({ email });

    return {
      code: otp.code,
      token,
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
