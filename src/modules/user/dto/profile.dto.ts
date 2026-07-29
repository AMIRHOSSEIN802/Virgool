import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../enums/gender.enum';
import {
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  Length,
} from 'class-validator';
import { ValidationMessage } from 'src/common/enums/message.enum';

export class ProfileDto {
  @ApiPropertyOptional()
  @Length(2, 10)
  nick_name: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Length(10, 200)
  bio: string;
  @ApiPropertyOptional({ nullable: true, format: 'binary' })
  image_profile: string;
  @ApiPropertyOptional({ nullable: true, format: 'binary' })
  bg_image: string;
  @ApiPropertyOptional({ nullable: true, enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender: string;
  @ApiPropertyOptional({ nullable: true, example: '2002-07-25T21:34:30.865Z' })
  birthday: Date;
  @ApiPropertyOptional({ nullable: true })
  linkedin_profile: string;
  @ApiPropertyOptional({ nullable: true })
  x_profile: string;
}

export class ChangeEmailDto {
  @ApiProperty()
  @IsEmail({}, { message: ValidationMessage.InvalidEmailFormat })
  email: string;
}
export class ChangePhoneDto {
  @ApiProperty()
  @IsMobilePhone('fa-IR', {}, { message: ValidationMessage.InvalidPhoneFormat })
  phone: string;
}
