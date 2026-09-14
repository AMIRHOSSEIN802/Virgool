'use client';

import { useCallback, useRef, useState } from 'react';
import { blogService } from '@/services/blog.service';
import { useAuth } from '@/hooks/useAuth';

interface UseBlogBookmarkOptions {
  blogId: number;
  /** Initial saved state when known (list/detail responses expose it). */
  initialSaved?: boolean;
  /** Called when the user must log in first (redirect to /auth). */
  onRequireAuth?: () => void;
  /** Notify the list owner that the saved state changed (for removal sync). */
  onSaveChange?: (blogId: number, saved: boolean) => void;
}

export interface BlogBookmarkController {
  saved: boolean;
  isPending: boolean;
  toggle: () => void;
}

/**
 * Shared bookmark/save logic (single source of truth for the API call,
 * optimistic update, rollback and auth handling) — mirrors useBlogLike's
 * concurrency model: while a toggle is in flight, extra clicks are collapsed
 * into one follow-up instead of firing parallel requests.
 */
export function useBlogBookmark({
  blogId,
  initialSaved,
  onRequireAuth,
  onSaveChange,
}: UseBlogBookmarkOptions): BlogBookmarkController {
  const { isAuthenticated } = useAuth();

  const [saved, setSaved] = useState(!!initialSaved);
  const [isPending, setIsPending] = useState(false);

  // Adopt authoritative state from server responses / blogId changes.
  const [lastAdopted, setLastAdopted] = useState<string | null>(`${blogId}:${!!initialSaved}`);
  const incoming = `${blogId}:${!!initialSaved}`;
  if (lastAdopted !== incoming) {
    setLastAdopted(incoming);
    setSaved(!!initialSaved);
  }

  const inFlight = useRef(false);
  const queuedClick = useRef(false);
  const lastState = useRef({ saved });

  const toggle = useCallback(async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (inFlight.current) {
      queuedClick.current = true;
      return;
    }
    inFlight.current = true;
    setIsPending(true);

    const run = async () => {
      const prev = lastState.current;
      const nextSaved = !prev.saved;
      setSaved(nextSaved);
      lastState.current = { saved: nextSaved };
      try {
        await blogService.toggleBookmark(blogId);
        onSaveChange?.(blogId, nextSaved);
      } catch {
        setSaved(prev.saved);
        lastState.current = prev;
      } finally {
        inFlight.current = false;
        setIsPending(false);
        if (queuedClick.current) {
          queuedClick.current = false;
          void run();
        }
      }
    };

    await run();
  }, [blogId, isAuthenticated, onRequireAuth, onSaveChange]);

  return { saved, isPending, toggle };
}
