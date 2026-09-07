import api from '@/lib/api';
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

  getGoogleAuthUrl(): string {
    return `${api.defaults.baseURL}/auth/google`;
  },
};
