import { ApiProperty } from '@nestjs/swagger';
import { AuthType } from '../enums/type.enums';
import { IsEnum, IsInt, IsString, Length, Min } from 'class-validator';
import { AuthMethod } from '../enums/method.enums';
import { Type } from 'class-transformer';

export class AuthDto {
  @ApiProperty()
  @IsString()
  @Length(3, 60)
  username: string;
  @ApiProperty({ enum: AuthType })
  @IsEnum(AuthType)
  type: AuthType;
  @ApiProperty({ enum: AuthMethod })
  @IsEnum(AuthMethod)
  method: AuthMethod;
}

export class CheckOtpDto {
  @ApiProperty()
  @IsString()
  @Length(5, 5)
  code: string;
}

export class UserBlockDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;
}

/** R-05 — body of POST /auth/google/exchange (one-time handoff code). */
export class GoogleExchangeDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  code: string;
}
