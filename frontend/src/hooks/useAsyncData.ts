'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';

interface UseAsyncDataOptions {
  /** When false the fetcher never runs (e.g. inactive admin tab). */
  enabled?: boolean;
  /** Persian error message shown on failure. */
  errorMessage?: string;
}

export interface AsyncDataResult<T> {
  data: T | null;
  error: string | null;
  /** HTTP status code of the failure, if any (e.g. 404). */
  status: number | null;
  /** True until the first request finishes. */
  isLoading: boolean;
  /** Re-run the fetcher (event-safe). */
  refetch: () => void;
}

/**
 * Data-loading hook for fetch-in-effect scenarios.
 *
 * Concurrency model (per-instance, not global):
 * - `requestIdRef` is a ref local to THIS hook instance, so parallel hooks on the
 *   same page (e.g. profileQuery + blogsQuery) can never discard each other's
 *   responses. A newer request from the SAME instance invalidates older ones only.
 * - Every setState happens after the first `await` (react-hooks
 *   set-state-in-effect safe) and skips updates after unmount.
 * - `refetch` bumps reloadKey; the effect re-runs, so request logic lives once.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  options: UseAsyncDataOptions = {}
): AsyncDataResult<T> {
  const { enabled = true, errorMessage = 'خطا در بارگذاری داده‌ها' } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [reloadKey, setReloadKey] = useState(0);

  const requestIdRef = useRef(0);
  // Keep the latest fetcher without touching refs during render:
  // assignment happens inside an effect (React-recommended ref-update pattern).
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    const thisRequest = ++requestIdRef.current;
    let cancelled = false;

    (async () => {
      try {
        const result = await fetcherRef.current();
        if (cancelled || thisRequest !== requestIdRef.current) return;
        setData(result);
        setError(null);
        setStatus(null);
        setIsLoading(false);
      } catch (err: unknown) {
        if (cancelled || thisRequest !== requestIdRef.current) return;
        setStatus((err as { response?: { status?: number } }).response?.status ?? null);
        setError(errorMessage);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, error, status, isLoading, refetch };
}
