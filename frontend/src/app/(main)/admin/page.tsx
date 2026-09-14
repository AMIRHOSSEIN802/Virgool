'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * /admin landing — the real admin UI lives in /admin/users and
 * /admin/comments (own pages, URL-state, AuthGuard requireAdmin on each).
 */
export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users');
  }, [router]);
  return null;
}
