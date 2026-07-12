import {
  BadRequestException,
  Injectable,
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
import { AuthMessage, BadRequestMessage } from 'src/common/enums/message.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
  ) {}

  usserExistence(authDto: AuthDto) {
    const { method, type, username } = authDto;

    switch (type) {
      case AuthType.Login:
        return this.login(method, username);

      case AuthType.Register:
        return this.register(method, username);

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

    return user;
  }

  async register(method: AuthMethod, username: string) {
    const validUsername = this.usernameValidator(method, username);

    const user = await this.checkExistUser(method, validUsername);

    if (user) {
      throw new UnauthorizedException(AuthMessage.AlreadyExistAccount);
    }

    return true;
  }

  async checkExistUser(method: AuthMethod, username: string) {
    if (method === AuthMethod.phone) {
      return await this.userRepository.findOneBy({ phone: username });
    }

    if (method === AuthMethod.Emai) {
      return await this.userRepository.findOneBy({ email: username });
    }

    if (method === AuthMethod.Username) {
      return await this.userRepository.findOneBy({ username });
    }

    throw new BadRequestException(BadRequestMessage.InvalidLoginDate);
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
