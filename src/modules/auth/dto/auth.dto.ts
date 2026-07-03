import { ApiProperty } from '@nestjs/swagger';
import { AuthType } from '../enums/type.enums';
import { IsEnum, IsString, Length } from 'class-validator';
import { AuthMethod } from '../enums/method.enums';

export class AuthDto {
  @ApiProperty()
  @IsString()
  @Length(3, 60)
  username: string;
  @ApiProperty({ enum: AuthType })
  @IsEnum(AuthDto)
  type: string;
  @ApiProperty({ enum: AuthMethod })
  @IsEnum(AuthDto)
  method: string;
}
