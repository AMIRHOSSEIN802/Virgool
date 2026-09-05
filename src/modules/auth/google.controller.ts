import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleUser } from './types/response';

@Controller('/auth/google')
@ApiTags('Google Auth')
@UseGuards(AuthGuard('google'))
export class GoogleAuthController {
  constructor(private authService: AuthService) {}

  @Get()
  googleLogin() {}

  @Get('/redirect')
  googleRedirect(@Req() req: Request) {
    const userData = req.user as GoogleUser;
    return this.authService.googleAuth(userData);
  }
}
