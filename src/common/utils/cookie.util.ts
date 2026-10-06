export function CookiesOptionsToken() {
  return {
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 60 * 2),
  };
}

/** Refresh session lifetime in days (R-05). */
export function refreshTtlDays(): number {
  const raw = Number(process.env.REFRESH_TOKEN_TTL_DAYS);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 30;
}

/**
 * Attributes shared by setting and clearing the refresh cookie (R-05):
 * HttpOnly (JavaScript can never read it), SameSite=Lax (never sent on
 * cross-site POSTs), Secure outside development, Path scoped to the auth
 * endpoints so it is not attached to every request.
 *
 * The Path value is what the BROWSER sees: the app is reached through the
 * Next.js `/api` proxy, so browser URLs are `/api/auth/refresh` etc. while
 * the backend itself routes `/auth/refresh` — cookie-parser does not filter
 * by path, so the backend reads the cookie regardless.
 */
function baseRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
  };
}

export function CookiesOptionsRefresh() {
  return {
    ...baseRefreshCookieOptions(),
    maxAge: refreshTtlDays() * 24 * 60 * 60 * 1000,
  };
}

/**
 * Options for clearing the refresh cookie (R-05). Identical attributes to
 * CookiesOptionsRefresh EXCEPT maxAge — a Max-Age would win over the past
 * Expires that clearCookie sets and the browser would keep the cookie.
 */
export function ClearCookiesOptionsRefresh() {
  return baseRefreshCookieOptions();
}
