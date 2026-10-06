import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './constants';

const TOKEN_STORAGE_KEY = 'virgool.access-token';

let accessToken: string | null = null;

// R-05 — single-flight refresh: concurrent 401s share ONE POST /auth/refresh.
let refreshPromise: Promise<string | null> | null = null;

// R-05 — set by the auth store so a failed refresh also clears app auth
// state (and thereby flows through AuthGuard's existing redirect logic).
type AuthFailureHandler = () => void;
let authFailureHandler: AuthFailureHandler | null = null;

/**
 * Per-request flags understood by this client. They are carried on the axios
 * config (never sent over the wire):
 * - `_skipAuthRefresh`: the request itself is the refresh (or logout) — a 401
 *   from it must never trigger another refresh (no recursion),
 * - `_retried`: the request already consumed its single post-refresh retry.
 */
export type AuthAwareConfig = AxiosRequestConfig & {
  _skipAuthRefresh?: boolean;
  _retried?: boolean;
};

/** Config for requests that must never trigger the refresh flow. */
export const skipAuthRefresh = (): AuthAwareConfig => ({
  _skipAuthRefresh: true,
});

// Restore a persisted session token (client only — SSR has no storage).
if (typeof window !== 'undefined') {
  try {
    accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    accessToken = null;
  }
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // storage unavailable — token stays in memory for this session only
    }
  }
};

export const getAccessToken = () => accessToken;

/**
 * Registers the callback invoked when a session cannot be refreshed (R-05):
 * the auth store uses it to clear user/isAuthenticated so AuthGuard redirects
 * through the existing /auth flow. Returns nothing; call with null to remove.
 */
export const registerAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler;
};

const notifyAuthFailure = () => {
  try {
    authFailureHandler?.();
  } catch {
    // a broken handler must never break the request flow
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * R-05 — rotates the HttpOnly refresh cookie into a fresh access token.
 * Single-flight: while one refresh is in the air every other 401 awaits the
 * same promise instead of firing its own POST. On any failure the in-memory
 * token is cleared and the auth store is told the session is gone.
 */
export const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await api.post<{ accessToken?: string }>(
          '/auth/refresh',
          undefined,
          skipAuthRefresh(),
        );
        const token = res.data?.accessToken;
        if (!token) throw new Error('refresh response has no accessToken');
        setAccessToken(token);
        return token;
      } catch {
        setAccessToken(null);
        notifyAuthFailure();
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AuthAwareConfig | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config._skipAuthRefresh &&
      !config._retried
    ) {
      const token = await refreshAccessToken();
      if (token) {
        // Exactly one retry; the request interceptor re-attaches the fresh
        // Bearer from the in-memory token before it goes back out.
        config._retried = true;
        return api(config);
      }
      // Refresh failed: token + auth state were already cleared inside
      // refreshAccessToken — fall through and reject the original request.
    }
    return Promise.reject(error);
  },
);

export default api;
