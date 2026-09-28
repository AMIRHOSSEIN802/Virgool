import { ConfigService } from '@nestjs/config';

/**
 * R-04 — global rate-limit defaults (per client IP, sliding window).
 *
 * Rationale for 100 requests / 60 seconds:
 *  - a normal page load in this frontend issues roughly 5–20 API requests
 *    (session check, feed page, categories, notifications badge …), so 100/min
 *    leaves several page loads of headroom before anything is throttled;
 *  - it still caps scraping/brute-force bursts at ~1.7 req/s per IP, which is
 *    the coarse backstop this task asks for;
 *  - the sensitive OTP flow keeps its OWN much tighter DB-backed limits
 *    (3 requests / 10 minutes, 5 failed attempts) — this layer never replaces
 *    them, it only adds coverage to routes that had none.
 *
 * Both values are overridable through the environment (RATE_LIMIT_TTL_MS,
 * RATE_LIMIT_MAX) so integration tests can run deterministic small windows
 * without disabling the limiter.
 */
export const RATE_LIMIT_DEFAULT_TTL_MS = 60_000;
export const RATE_LIMIT_DEFAULT_MAX = 100;

/** Positive finite integer override, otherwise the given default. */
export function readPositiveInt(raw: unknown, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/** Resolves the effective window/limit for the global throttler. */
export function rateLimitFromEnv(config: ConfigService): {
  ttl: number;
  limit: number;
} {
  return {
    ttl: readPositiveInt(
      config.get('RATE_LIMIT_TTL_MS'),
      RATE_LIMIT_DEFAULT_TTL_MS,
    ),
    limit: readPositiveInt(
      config.get('RATE_LIMIT_MAX'),
      RATE_LIMIT_DEFAULT_MAX,
    ),
  };
}
