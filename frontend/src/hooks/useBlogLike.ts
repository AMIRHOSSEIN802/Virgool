'use client';

import { useCallback, useRef, useState } from 'react';
import { blogService } from '@/services/blog.service';
import { useAuth } from '@/hooks/useAuth';

interface UseBlogLikeOptions {
  blogId: number;
  /** Initial liked state when known (detail page). Optional for cards. */
  initialLiked?: boolean;
  initialCount?: number;
  /** Called when the user must log in first (e.g. redirect to /auth). */
  onRequireAuth?: () => void;
  /** Notify parent/list owner that the like state changed (for cross-view sync). */
  onLikeChange?: (blogId: number, liked: boolean, count: number) => void;
}

export interface BlogLikeController {
  liked: boolean;
  count: number;
  isPending: boolean;
  hasKnownState: boolean;
  toggle: () => void;
}

/**
 * Shared like/unlike logic for BlogCard and BlogActions (single source of truth
 * for the API call, optimistic update, rollback and auth handling).
 *
 * - `hasKnownState` is false until the server confirms the initial state, so
 *   cards don't render a wrong "liked" fill for blogs the user hasn't opened.
 * - Rapid clicks are serialized: while one toggle is in-flight, further clicks
 *   are queued (max 1 pending) instead of firing parallel requests.
 */
export function useBlogLike({
  blogId,
  initialLiked,
  initialCount,
  onRequireAuth,
  onLikeChange,
}: UseBlogLikeOptions): BlogLikeController {
  const { isAuthenticated } = useAuth();
  const knowsState = typeof initialLiked === 'boolean' && typeof initialCount === 'number';

  const [liked, setLiked] = useState(knowsState ? (initialLiked as boolean) : false);
  const [count, setCount] = useState(knowsState ? (initialCount as number) : 0);
  const [isPending, setIsPending] = useState(false);
  const [known, setKnown] = useState(knowsState);

  // Adopt the authoritative state whenever the parent re-fetches (e.g. after
  // comment actions) or the blogId changes. Render-time state adjustment keyed
  // on the incoming values — the React-recommended alternative to setState in
  // effects (no refs touched during render).
  const [lastAdopted, setLastAdopted] = useState<string | null>(
    knowsState ? `${blogId}:${initialLiked}:${initialCount}` : null
  );
  const incoming = `${blogId}:${initialLiked}:${initialCount}`;
  if (knowsState && lastAdopted !== incoming) {
    setLastAdopted(incoming);
    setLiked(initialLiked as boolean);
    setCount(initialCount as number);
    setKnown(true);
  }

  const inFlight = useRef(false);
  const queuedClick = useRef(false);
  const lastState = useRef({ liked, count });

  const toggle = useCallback(async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (inFlight.current) {
      queuedClick.current = true; // collapse rapid clicks into one follow-up
      return;
    }
    inFlight.current = true;
    setIsPending(true);

    const run = async () => {
      const prev = lastState.current;
      const nextLiked = !prev.liked;
      const nextCount = Math.max(0, prev.count + (nextLiked ? 1 : -1));
      // optimistic
      setLiked(nextLiked);
      setCount(nextCount);
      lastState.current = { liked: nextLiked, count: nextCount };
      try {
        await blogService.toggleLike(blogId);
        onLikeChange?.(blogId, nextLiked, nextCount);
      } catch {
        // rollback on failure
        setLiked(prev.liked);
        setCount(prev.count);
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
  }, [blogId, isAuthenticated, onRequireAuth, onLikeChange]);

  return { liked, count, isPending, hasKnownState: known, toggle };
}
