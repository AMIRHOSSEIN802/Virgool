import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleUser } from './types/response';
import { GoogleExchangeDto } from './dto/auth.dto';
import { SwaggerConsumes } from 'src/common/enums/swagger.consumes.eum';
import { SameOriginGuard } from 'src/common/guards/same-origin.guard';
import { frontendOrigin } from 'src/common/utils/origin.util';

@Controller('/auth/google')
@ApiTags('Google Auth')
export class GoogleAuthController {
  constructor(private authService: AuthService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  /**
   * Passport hands the Google profile over; the service finds/creates the
   * user and mints a one-time handoff code. The redirect carries ONLY that
   * short-lived single-use code — never a JWT, never an access/refresh token
   * (R-05: URLs end up in browser history, referrers and proxy logs).
   */
  @Get('/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(@Req() req: Request, @Res() res: Response) {
    const userData = req.user as GoogleUser;
    const { code } = await this.authService.googleAuth(userData);
    return res.redirect(
      `${frontendOrigin()}/auth/google/callback?code=${encodeURIComponent(code)}`,
    );
  }

  /**
   * R-05 — spends the one-time handoff code for a real session: the response
   * body carries the access token and the refresh token is set as an HttpOnly
   * cookie. A used/expired/unknown code is rejected with 401.
   */
  @Post('/exchange')
  @UseGuards(SameOriginGuard)
  @ApiConsumes(SwaggerConsumes.UrlEncoded, SwaggerConsumes.Json)
  exchange(
    @Body() googleExchangeDto: GoogleExchangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.exchangeGoogleCode(googleExchangeDto.code, res);
  }
}
