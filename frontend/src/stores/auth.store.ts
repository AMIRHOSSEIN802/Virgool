'use client';

import { create } from 'zustand';
import type { UserEntity } from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { setAccessToken } from '@/lib/api';

interface AuthState {
  user: UserEntity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkLogin: () => Promise<void>;
  setUser: (user: UserEntity | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkLogin: async () => {
    try {
      const user = await authService.checkLogin();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
