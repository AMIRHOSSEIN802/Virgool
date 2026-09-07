'use client';

import { ReactNode, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import ThemeProvider from '@/components/layout/ThemeProvider';

export default function Providers({ children }: { children: ReactNode }) {
  const checkLogin = useAuthStore((s) => s.checkLogin);

  useEffect(() => {
    checkLogin();
  }, [checkLogin]);

  return (
    <ThemeProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            direction: 'rtl',
            boxShadow: 'var(--shadow-lg)',
          },
        }}
      />
    </ThemeProvider>
  );
}
