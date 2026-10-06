/**
 * R-05 — origin helpers shared by the SameOriginGuard and the Google
 * callback redirect.
 *
 * The API is reached through the Next.js proxy (same browser origin), and the
 * backend has NO CORS configuration — these helpers only decide which
 * `Origin` header values are allowed to spend a refresh cookie or a
 * one-time code. `FRONTEND_ORIGIN` (comma-separated) is the production
 * override; localhost entries cover development.
 */

const DEV_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function configuredOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGIN ?? '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function allowedOrigins(): Set<string> {
  return new Set([...DEV_ORIGINS, ...configuredOrigins()]);
}

/** Base URL of the frontend app (first configured origin, dev default :3001). */
export function frontendOrigin(): string {
  return configuredOrigins()[0] ?? 'http://localhost:3001';
}
