import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { AuthMessage } from 'src/common/enums/message.enum';
import { isJWT } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { SKIP_AUTH } from 'src/common/decorators/skip-auth.decorator';
import { ALLOW_BLOCKED } from 'src/common/decorators/allow-blocked.decorator';
import { UserStatus } from 'src/modules/user/enums/status.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authservice: AuthService,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isSkippedAuthorization = this.reflector.get<boolean>(
      SKIP_AUTH,
      context.getHandler(),
    );
    if (isSkippedAuthorization) return true;
    const httpContext = context.switchToHttp();
    const request: Request = httpContext.getRequest<Request>();
    const token = this.extractToken(request);
    request.user = await this.authservice.validateAccessToken(token);
    // Blocked users are rejected everywhere EXCEPT routes that opt in with
    // @AllowBlocked() (self account deletion). Auth is still enforced above.
    const allowBlocked = this.reflector.getAllAndOverride<boolean>(
      ALLOW_BLOCKED,
      [context.getHandler(), context.getClass()],
    );
    if (!allowBlocked && request?.user?.status === UserStatus.Block) {
      throw new ForbiddenException(AuthMessage.Blocked);
    }
    return true;
  }
  protected extractToken(request: Request) {
    const { authorization } = request.headers;
    if (!authorization || authorization?.trim() == '') {
      throw new UnauthorizedException(AuthMessage.LoginIsRequired);
    }
    const [bearer, token] = authorization.split(' ');
    if (bearer?.toLowerCase() !== 'bearer' || !token || !isJWT(token)) {
      throw new UnauthorizedException(AuthMessage.LoginIsRequired);
    }
    return token;
  }
}
