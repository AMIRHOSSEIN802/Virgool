import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthMessage } from 'src/common/enums/message.enum';
import { allowedOrigins } from 'src/common/utils/origin.util';

/**
 * R-05 — small reusable origin check for the cookie-authenticated state
 * endpoints (POST /auth/refresh, /auth/logout, /auth/google/exchange).
 *
 * Defense in depth on top of SameSite=Lax (which already stops cross-site
 * POSTs from carrying the cookie):
 * - no Origin header (curl, server-to-server, supertest) → allowed,
 * - Origin present → must be the configured frontend origin (or a dev
 *   localhost origin). Anything else is rejected with 403.
 *
 * This is intentionally NOT a CORS setup: the API still serves no CORS
 * headers and remains reachable only same-origin through the Next proxy.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (!origin) return true;
    if (!allowedOrigins().has(origin)) {
      throw new ForbiddenException(AuthMessage.UntrustedOrigin);
    }
    return true;
  }
}
