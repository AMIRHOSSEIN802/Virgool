import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const {
  exchangeMock,
  checkLoginMock,
  replaceMock,
  getParamMock,
  setAccessTokenMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  exchangeMock: vi.fn(),
  checkLoginMock: vi.fn(),
  replaceMock: vi.fn(),
  getParamMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => getParamMock(key) }),
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    exchangeGoogleCode: exchangeMock,
    checkLogin: checkLoginMock,
    userExistence: vi.fn(),
    logout: vi.fn(),
    getGoogleAuthUrl: vi.fn(),
  },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ checkLogin: checkLoginMock }),
}));

vi.mock('@/lib/api', () => ({ setAccessToken: setAccessTokenMock }));

vi.mock('react-hot-toast', () => ({ default: { error: toastErrorMock } }));

import GoogleCallbackPage from './page';

/**
 * R-05 — the Google callback consumes a ONE-TIME code (never a JWT in the
 * URL): it must exchange it through the API client, keep tokens out of the
 * query handling itself, and land on /auth for missing/expired/used codes.
 */
describe('Google callback page (R-05 one-time code)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getParamMock.mockImplementation((key: string) =>
      key === 'code' ? 'ONE-TIME-CODE' : null,
    );
  });

  it('exchanges the code, stores the access token and goes home', async () => {
    exchangeMock.mockResolvedValue({ message: 'ok', accessToken: 'access-1' });
    checkLoginMock.mockResolvedValue({ id: 1, username: 'u', profile: {} });

    render(<GoogleCallbackPage />);

    await waitFor(() =>
      expect(exchangeMock).toHaveBeenCalledWith('ONE-TIME-CODE'),
    );
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-1');
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('without a code: no exchange happens, friendly error, back to /auth', async () => {
    getParamMock.mockReturnValue(null);

    render(<GoogleCallbackPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth'));
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(setAccessTokenMock).not.toHaveBeenCalled();
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
  });

  it('failed exchange (expired/used code): no token stored, back to /auth', async () => {
    exchangeMock.mockRejectedValue(new Error('401'));

    render(<GoogleCallbackPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth'));
    expect(setAccessTokenMock).not.toHaveBeenCalled();
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
  });

  it('exchange succeeded but check-login failed: no dead shell, back to /auth', async () => {
    exchangeMock.mockResolvedValue({ message: 'ok', accessToken: 'access-2' });
    checkLoginMock.mockResolvedValue(null);

    render(<GoogleCallbackPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth'));
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-2');
  });
});
