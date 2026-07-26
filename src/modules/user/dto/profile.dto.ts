import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../enums/gender.enum';
import { IsEnum, Length } from 'class-validator';

export class ProfileDto {
  @ApiPropertyOptional()
  @Length(2, 10)
  nick_name: string;
  @ApiPropertyOptional({ nullable: true })
  @Length(10, 200)
  bio: string;
  @ApiPropertyOptional({ nullable: true, format: 'binary' })
  image_profile: string;
  @ApiPropertyOptional({ nullable: true, format: 'binary' })
  bg_image: string;
  @ApiPropertyOptional({ nullable: true, enum: Gender })
  @IsEnum(Gender)
  gender: string;
  @ApiPropertyOptional({ nullable: true, example: '2002-07-25T21:34:30.865Z' })
  birthday: Date;
  @ApiPropertyOptional({ nullable: true })
  linkedin_profile: string;
  @ApiPropertyOptional({ nullable: true })
  x_profile: string;
}
