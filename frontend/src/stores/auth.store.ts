'use client';

import { create } from 'zustand';
import type { UserEntity } from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { setAccessToken } from '@/lib/api';

interface AuthState {
  user: UserEntity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkLogin: () => Promise<UserEntity | null>;
  setUser: (user: UserEntity | null) => void;
  logout: () => void;
}

let inflightCheckLogin: Promise<UserEntity | null> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkLogin: () => {
    // De-dupe concurrent calls: multiple components call checkLogin on mount;
    // they must share one request instead of firing several.
    if (inflightCheckLogin) return inflightCheckLogin;

    inflightCheckLogin = authService
      .checkLogin()
      .then((user) => {
        set({ user, isAuthenticated: true, isLoading: false });
        return user;
      })
      .catch(() => {
        setAccessToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      })
      .finally(() => {
        inflightCheckLogin = null;
      });

    return inflightCheckLogin;
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
