import { describe, it, expect, vi, beforeEach } from 'vitest';

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  default: { post: postMock, get: getMock, defaults: { baseURL: '/api' } },
  skipAuthRefresh: () => ({ _skipAuthRefresh: true }),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  registerAuthFailureHandler: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

import { authService } from '@/services/auth.service';

describe('authService session endpoints (R-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logout POSTs /auth/logout flagged to never trigger a refresh', async () => {
    postMock.mockResolvedValue({ data: { message: 'logged out' } });

    const result = await authService.logout();

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/auth/logout', undefined, {
      _skipAuthRefresh: true,
    });
    expect(result).toEqual({ message: 'logged out' });
  });

  it('exchangeGoogleCode spends the one-time code at /auth/google/exchange', async () => {
    postMock.mockResolvedValue({
      data: { message: 'ok', accessToken: 'access-token' },
    });
    const code = 'C'.repeat(43);

    const result = await authService.exchangeGoogleCode(code);

    expect(postMock).toHaveBeenCalledWith('/auth/google/exchange', { code });
    expect(result.accessToken).toBe('access-token');
  });

  it('checkLogin still reads GET /auth/check-login through the shared client', async () => {
    getMock.mockResolvedValue({ data: { id: 7, username: 'someone' } });

    const result = await authService.checkLogin();

    expect(getMock).toHaveBeenCalledWith('/auth/check-login');
    expect(result).toEqual({ id: 7, username: 'someone' });
  });
});
