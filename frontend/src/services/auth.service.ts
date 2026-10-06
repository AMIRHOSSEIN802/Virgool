import api, { skipAuthRefresh } from '@/lib/api';
import type { AuthDto, AuthResponse, UserEntity } from '@/types/auth.types';

export const authService = {
  async userExistence(data: AuthDto): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/user-existence', data);
    return res.data;
  },

  async checkOtp(code: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/check-otp', { code });
    return res.data;
  },

  async checkLogin(): Promise<UserEntity> {
    const res = await api.get<UserEntity>('/auth/check-login');
    return res.data;
  },

  /** R-05 — server-side logout: revokes the session behind the refresh cookie. */
  async logout(): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(
      '/auth/logout',
      undefined,
      skipAuthRefresh(),
    );
    return res.data;
  },

  /**
   * R-05 — Google callback step: spends the one-time handoff code for an
   * access token (the refresh token arrives as an HttpOnly cookie).
   */
  async exchangeGoogleCode(code: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/google/exchange', { code });
    return res.data;
  },

  getGoogleAuthUrl(): string {
    return `${api.defaults.baseURL}/auth/google`;
  },
};
