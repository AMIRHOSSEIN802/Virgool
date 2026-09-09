'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * Client-side guard for authenticated (optionally admin-only) pages.
 * Redirects to /auth and carries the current path so login returns the user here.
 */
export default function AuthGuard({ children, requireAdmin }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const current = window.location.pathname + window.location.search;
      router.push(`/auth?redirect=${encodeURIComponent(current)}`);
      return;
    }
    if (requireAdmin && user?.role !== 'admin') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, requireAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireAdmin && user?.role !== 'admin') return null;

  return <>{children}</>;
}
