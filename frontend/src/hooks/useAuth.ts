'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const { user, isLoading, isAuthenticated, checkLogin, logout } = useAuthStore();

  useEffect(() => {
    if (isLoading) {
      checkLogin();
    }
  }, [isLoading, checkLogin]);

  return { user, isLoading, isAuthenticated, logout };
}
