import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * HTTP security headers (Helmet) for the Express adapter.
 *
 * Defaults are kept except for two verified application requirements:
 * - `contentSecurityPolicy` is OFF: Swagger UI (`/swagger`) serves inline
 *   scripts that a default CSP would block, and this API renders no
 *   browser HTML of its own — there is nothing for a CSP to protect here.
 *   Revisit if the backend ever serves its own pages.
 * - `crossOriginResourcePolicy` is `cross-origin`: backend-hosted images
 *   under `public/` are public content that the Next.js frontend loads
 *   cross-origin (see `frontend/src/lib/constants.ts` `getImageUrl`), so
 *   the default `same-origin` policy would break article covers and avatars
 *   in browsers.
 *
 * Everything else stays at Helmet defaults (HSTS, nosniff, frameguard,
 * hidePoweredBy, referrer-policy, …). CORS is intentionally untouched: the
 * API is reached through the Next.js `/api` rewrite proxy and has no CORS
 * configuration by design.
 */
export function securityHeadersOptions(): Parameters<typeof helmet>[0] {
  return {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  };
}

/** Applies the shared security-header configuration to an application. */
export function applySecurityHeaders(app: INestApplication): void {
  app.use(helmet(securityHeadersOptions()));
}
