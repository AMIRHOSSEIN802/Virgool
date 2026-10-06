import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthDto, CheckOtpDto } from './dto/auth.dto';
import { SwaggerConsumes } from 'src/common/enums/swagger.consumes.eum';
import type { Request, Response } from 'express';
import { AuthDecorator } from 'src/common/decorators/auth.decorators';
import { CanAccess } from 'src/common/decorators/role.dexorator';
import { Roles } from 'src/common/enums/role.eunm';
import { serializeAuthenticatedUser } from './auth-user.serializer';
import { SameOriginGuard } from 'src/common/guards/same-origin.guard';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('user-existence')
  @ApiConsumes(SwaggerConsumes.UrlEncoded, SwaggerConsumes.Json)
  userExistence(@Body() authDto: AuthDto, @Res() res: Response) {
    return this.authService.userExistence(authDto, res);
  }
  @Post('check-otp')
  @ApiConsumes(SwaggerConsumes.UrlEncoded, SwaggerConsumes.Json)
  checkOtp(
    @Body() checkOtpDto: CheckOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.checkOtp(checkOtpDto.code, res);
  }

  /**
   * R-05 — rotate the HttpOnly refresh cookie into a fresh access token.
   * Cookie-authenticated (no Bearer), origin-checked, rate-limited globally.
   */
  @Post('refresh')
  @UseGuards(SameOriginGuard)
  refresh(@Res({ passthrough: true }) res: Response) {
    return this.authService.refreshSession(res);
  }

  /**
   * R-05 — server-side logout: revoke the session family behind the cookie
   * and clear it. Idempotent and deliberately NOT access-token protected —
   * possessing the refresh cookie is the capability being surrendered.
   */
  @Post('logout')
  @UseGuards(SameOriginGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Get('check-login')
  @AuthDecorator()
  @CanAccess(Roles.Admin, Roles.User)
  checkLogin(@Req() req: Request) {
    // R-05: never leak the raw UserEntity (password, otpId, new_email,
    // new_Phone, …) — return an explicit whitelist of safe fields.
    return serializeAuthenticatedUser(req.user);
  }
}
