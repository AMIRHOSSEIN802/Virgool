'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { authService } from '@/services/auth.service';
import Spinner from '@/components/ui/Spinner';

function AuthCard() {
  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleAuthUrl();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
            style={{ background: 'var(--primary)' }}
          >
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ویرگول
          </span>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 shadow-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Suspense
            fallback={
              <div className="flex justify-center py-10">
                <Spinner size="lg" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3" style={{ background: 'var(--surface)', color: 'var(--text-tertiary)' }}>
                  یا
                </span>
              </div>
            </div>
            <button
              onClick={handleGoogleLogin}
              className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              ورود با گوگل
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          با ورود یا ثبت‌نام، شما{' '}
          <Link href="#" style={{ color: 'var(--link)' }} className="hover:underline">
            قوانین و مقررات
          </Link>{' '}
          را می‌پذیرید.
        </p>

        <p className="mt-4 text-center text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            بازگشت به صفحه اصلی
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <AuthCard />;
}
