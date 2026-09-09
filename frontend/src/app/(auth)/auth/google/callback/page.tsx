'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import Spinner from '@/components/ui/Spinner';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkLogin = useAuthStore((s) => s.checkLogin);
  const ranOnce = useRef(false);

  useEffect(() => {
    // Guard against StrictMode double-invoke in dev
    if (ranOnce.current) return;
    ranOnce.current = true;

    const token = searchParams.get('token');
    if (token) {
      setAccessToken(token);
      checkLogin().then(() => {
        router.replace('/');
      });
    } else {
      toast();
      router.replace('/auth');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4" style={{ color: 'var(--text-tertiary)' }}>در حال ورود...</p>
      </div>
    </div>
  );
}

function toast() {
  // Lazy import avoided for bundle simplicity; shows a friendly message on failure.
  import('react-hot-toast').then(({ default: t }) => t.error('ورود با گوگل ناموفق بود'));
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <Spinner size="lg" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
