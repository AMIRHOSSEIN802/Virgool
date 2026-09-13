'use client';

import { create } from 'zustand';
import type { UserEntity } from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
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

/**
 * /auth/check-login returns the user WITHOUT the `profile` relation, so a
 * freshly-loaded session would render the Avatar fallback (initials) even for
 * users who have a real image. Hydrate the profile once from /user/profile so
 * every consumer of the store (header, dropdown) sees the full user.
 */
const hydrateUser = async (user: UserEntity): Promise<UserEntity> => {
  if (!user || user.profile) return user;
  try {
    const full = await userService.getProfile();
    return { ...user, profile: full.profile ?? null };
  } catch {
    // Profile fetch failed — keep the user; Avatar falls back to initials.
    return user;
  }
};

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
      .then(hydrateUser)
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

  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
    // Late-hydrate the profile (check-login/OTP payloads omit it) without
    // blocking the login flow — the header avatar updates when it arrives.
    if (user && !user.profile) {
      hydrateUser(user).then((full) => {
        if (full.profile) set({ user: full });
      });
    }
  },
  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
