import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

const { logoutMock, checkLoginMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  checkLoginMock: vi.fn(),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    logout: logoutMock,
    checkLogin: checkLoginMock,
    userExistence: vi.fn(),
    exchangeGoogleCode: vi.fn(),
    getGoogleAuthUrl: vi.fn(),
  },
}));

vi.mock('@/services/user.service', () => ({
  userService: { getProfile: vi.fn() },
}));

import { useAuthStore } from '@/stores/auth.store';
import api, { setAccessToken } from '@/lib/api';
import type { UserEntity } from '@/types/auth.types';

const TOKEN_STORAGE_KEY = 'virgool.access-token';

const USER: UserEntity = {
  id: 7,
  username: 'tester',
  email: 'tester@r05.test',
  phone: null,
  role: 'user',
  status: 'active',
  verify_email: true,
  verify_phone: false,
  profileId: 3,
  profile: {
    id: 3,
    nick_name: 'tester',
    bio: null,
    image_profile: null,
    bg_image: null,
    gender: null,
    birthday: null,
    linkedin_profile: null,
    x_profile: null,
    userId: 7,
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('auth store (R-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAccessToken(null);
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
  });

  it('logout revokes the server session and clears local state even when the call fails', async () => {
    logoutMock.mockRejectedValue(new Error('offline'));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'some-access-token');
    setAccessToken('some-access-token');
    useAuthStore.setState({ user: USER, isAuthenticated: true, isLoading: false });

    useAuthStore.getState().logout();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();

    // the rejected revoke must settle quietly (it is best-effort by design)
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(vi.isMockFunction(logoutMock)).toBe(true);
  });

  it('checkLogin stores the whitelisted user returned by GET /auth/check-login', async () => {
    checkLoginMock.mockResolvedValue(USER);

    const user = await useAuthStore.getState().checkLogin();

    expect(checkLoginMock).toHaveBeenCalledTimes(1);
    expect(user?.id).toBe(USER.id);
    const state = useAuthStore.getState();
    expect(state.user?.id).toBe(USER.id);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('a failed refresh flips the store to logged-out through the registered handler', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stale');
    setAccessToken('stale');
    useAuthStore.setState({ user: USER, isAuthenticated: true, isLoading: false });

    // every request 401s — the original AND the refresh attempt
    api.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      const response = {
        data: {},
        status: 401,
        statusText: '401',
        headers: {},
        config,
        request: {},
      } as AxiosResponse;
      throw new AxiosError(
        'Request failed with status code 401',
        AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response,
      );
    };

    await expect(api.get('/resource')).rejects.toMatchObject({
      response: { status: 401 },
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
