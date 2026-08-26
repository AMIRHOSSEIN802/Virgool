import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { isJWT } from 'class-validator';

import { AuthService } from 'src/modules/auth/auth.service';

@Injectable()
export class AddUserToReqWOV implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractToken(req);

    if (!token) {
      return next();
    }

    try {
      const user = await this.authService.validateAccessToken(token);

      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error(error);
    }

    next();
  }

  protected extractToken(request: Request): string | null {
    const { authorization } = request.headers;

    if (!authorization || authorization.trim() === '') {
      return null;
    }

    const [bearer, token] = authorization.split(' ');

    if (bearer?.toLowerCase() !== 'bearer' || !token || !isJWT(token)) {
      return null;
    }

    return token;
  }
}
