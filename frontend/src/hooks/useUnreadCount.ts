'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationService } from '@/services/notification.service';
import { useAuth } from '@/hooks/useAuth';

/**
 * Shared unread-count store so the Header badge and the /notifications page
 * agree without prop-drilling or a second state library. One in-flight poll
 * per mount; refresh() is called after read/mark-all mutations.
 * (Small module-level store — the project's pattern is zustand for user state;
 * this is a single primitive number, not a general store.)
 */
let cachedCount = 0;
const listeners = new Set<(n: number) => void>();

const publish = (n: number) => {
  cachedCount = n;
  listeners.forEach((l) => l(n));
};

export function useUnreadCount(): { unread: number; refresh: () => void } {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(cachedCount);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    listeners.add(setCount);
    return () => {
      mounted.current = false;
      listeners.delete(setCount);
    };
  }, []);

  const refresh = useCallback(() => {
    if (!isAuthenticated) {
      publish(0);
      return;
    }
    notificationService
      .unreadCount()
      .then((n) => {
        if (mounted.current) publish(n);
      })
      .catch(() => {
        /* badge is non-critical */
      });
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { unread: isAuthenticated ? count : 0, refresh };
}
