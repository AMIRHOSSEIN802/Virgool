'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Thin hook over the auth store. The store's isLoading starts as `true`, so
 * every page that uses this hook (directly or via AuthGuard) triggers exactly
 * one shared checkLogin request per page load — duplicates are de-duped in the
 * store itself.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkLogin = useAuthStore((s) => s.checkLogin);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (isLoading) {
      checkLogin();
    }
  }, [isLoading, checkLogin]);

  return { user, isLoading, isAuthenticated, logout };
}
