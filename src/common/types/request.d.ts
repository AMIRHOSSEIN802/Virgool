import { UserEntity } from 'src/modules/user/entities/user.entity';

declare module 'express-serve-static-core' {
  interface Request {
    user: UserEntity;
  }
}

export {};
