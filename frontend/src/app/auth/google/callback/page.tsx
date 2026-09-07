'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import Spinner from '@/components/ui/Spinner';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkLogin = useAuthStore((s) => s.checkLogin);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setAccessToken(token);
      checkLogin().then(() => {
        router.push('/');
      });
    } else {
      router.push('/auth');
    }
  }, [searchParams, router, checkLogin]);

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4" style={{ color: 'var(--text-tertiary)' }}>در حال ورود...</p>
      </div>
    </div>
  );
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
