import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import api, {
  setAccessToken,
  getAccessToken,
  registerAuthFailureHandler,
} from '@/lib/api';

/**
 * R-05 — observable behaviour of the shared Axios client: single-flight
 * refresh, exactly one retry, failure signalling to the auth store, and the
 * guarantee that only the access token ever touches localStorage.
 *
 * The adapter is replaced with an in-memory router so every HTTP exchange is
 * scripted per test; nothing here touches the network or a real backend.
 */

const TOKEN_STORAGE_KEY = 'virgool.access-token';

type RouteResult = { status: number; data?: unknown };
type RouteHandler = (
  config: InternalAxiosRequestConfig,
) => RouteResult | Promise<RouteResult>;

const calls: InternalAxiosRequestConfig[] = [];
let routeHandler: RouteHandler = () => ({ status: 404, data: {} });

const installAdapter = () => {
  api.defaults.adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    calls.push(config);
    const route = await routeHandler(config);
    const response = {
      data: route.data ?? {},
      status: route.status,
      statusText: String(route.status),
      headers: {},
      config,
      request: {},
    } as AxiosResponse;
    if (route.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${route.status}`,
        AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response,
      );
    }
    return response;
  };
};

const urls = (): string[] => calls.map((config) => config.url ?? '');
const countUrl = (url: string): number =>
  urls().filter((entry) => entry === url).length;

const isRetried = (config: InternalAxiosRequestConfig): boolean =>
  (config as { _retried?: boolean })._retried === true;

const authHeaderOf = (config: InternalAxiosRequestConfig): string | undefined => {
  const headers = config.headers as
    | { get?: (name: string) => unknown; Authorization?: unknown }
    | undefined;
  const viaGet =
    headers && typeof headers.get === 'function'
      ? headers.get('Authorization')
      : undefined;
  if (typeof viaGet === 'string') return viaGet;
  const direct = headers?.Authorization;
  return typeof direct === 'string' ? direct : undefined;
};

describe('api client session handling (R-05)', () => {
  beforeEach(() => {
    calls.length = 0;
    localStorage.clear();
    setAccessToken(null);
    registerAuthFailureHandler(null);
    routeHandler = () => ({ status: 404, data: {} });
    installAdapter();
  });

  it('attaches the current Bearer token — and nothing when logged out', async () => {
    routeHandler = () => ({ status: 200, data: { ok: true } });

    setAccessToken('token-abc');
    await api.get('/with-token');
    expect(authHeaderOf(calls[0])).toBe('Bearer token-abc');

    setAccessToken(null);
    await api.get('/without-token');
    expect(authHeaderOf(calls[1])).toBeUndefined();
  });

  it('on 401: one refresh, then the original request is retried exactly once', async () => {
    setAccessToken('stale');
    let refreshHadSkipFlag = false;
    routeHandler = (config) => {
      if (config.url === '/auth/refresh') {
        refreshHadSkipFlag =
          (config as { _skipAuthRefresh?: boolean })._skipAuthRefresh === true;
        return { status: 200, data: { accessToken: 'fresh' } };
      }
      return isRetried(config)
        ? { status: 200, data: { ok: true } }
        : { status: 401, data: {} };
    };

    const res = await api.get<{ ok: boolean }>('/resource');
    expect(res.data.ok).toBe(true);
    expect(urls()).toEqual(['/resource', '/auth/refresh', '/resource']);
    expect(countUrl('/auth/refresh')).toBe(1);
    expect(authHeaderOf(calls[2])).toBe('Bearer fresh');
    expect(refreshHadSkipFlag).toBe(true);
    expect(getAccessToken()).toBe('fresh');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('fresh');
  });

  it('concurrent 401s share ONE refresh (single-flight)', async () => {
    setAccessToken('stale');
    routeHandler = (config) => {
      if (config.url === '/auth/refresh') {
        return { status: 200, data: { accessToken: 'fresh' } };
      }
      return isRetried(config) ? { status: 200, data: {} } : { status: 401, data: {} };
    };

    await Promise.all([api.get('/a'), api.get('/b')]);

    expect(countUrl('/auth/refresh')).toBe(1);
    expect(countUrl('/a')).toBe(2); // original + one retry each
    expect(countUrl('/b')).toBe(2);
    expect(getAccessToken()).toBe('fresh');
  });

  it('failed refresh: clears the token, notifies the auth store, never recurses', async () => {
    setAccessToken('stale');
    const onAuthFailure = vi.fn();
    registerAuthFailureHandler(onAuthFailure);
    routeHandler = () => ({ status: 401, data: {} }); // even the refresh 401s

    await expect(api.get('/resource')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(countUrl('/auth/refresh')).toBe(1); // exactly one attempt, no loop
    expect(countUrl('/resource')).toBe(1); // no retry without a new token
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('retries at most once — a 401 after a successful refresh is surfaced as-is', async () => {
    setAccessToken('stale');
    const onAuthFailure = vi.fn();
    registerAuthFailureHandler(onAuthFailure);
    routeHandler = (config) => {
      if (config.url === '/auth/refresh') {
        return { status: 200, data: { accessToken: 'fresh' } };
      }
      return { status: 401, data: {} }; // endpoint-level rejection
    };

    await expect(api.get('/resource')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(countUrl('/resource')).toBe(2); // original + exactly one retry
    expect(countUrl('/auth/refresh')).toBe(1);
    expect(getAccessToken()).toBe('fresh'); // live session not nuked by an endpoint 401
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('localStorage only ever holds the access token — never a refresh token', async () => {
    setAccessToken('stale');
    routeHandler = (config) => {
      if (config.url === '/auth/refresh') {
        return { status: 200, data: { accessToken: 'fresh' } };
      }
      return isRetried(config) ? { status: 200, data: {} } : { status: 401, data: {} };
    };

    await api.get('/resource');

    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe(TOKEN_STORAGE_KEY);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('fresh');
  });
});
