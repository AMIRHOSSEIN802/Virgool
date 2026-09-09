import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleUser } from './types/response';

@Controller('/auth/google')
@ApiTags('Google Auth')
@UseGuards(AuthGuard('google'))
export class GoogleAuthController {
  constructor(private authService: AuthService) {}

  @Get()
  googleLogin() {}

  /**
   * Passport hands the Google profile over; the service signs in / registers
   * the user and this handler redirects to the FRONTEND callback with the
   * access token in the query string — matching what the Next.js callback
   * page (/auth/google/callback) expects: /auth/google/callback?token=...
   */
  @Get('/redirect')
  async googleRedirect(@Req() req: Request, @Res() res: Response) {
    const userData = req.user as GoogleUser;
    const { token } = await this.authService.googleAuth(userData);
    return res.redirect(
      `http://localhost:3001/auth/google/callback?token=${encodeURIComponent(token)}`,
    );
  }
}
