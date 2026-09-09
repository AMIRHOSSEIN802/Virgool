'use client';

import { blogService, BlogListResponse } from '@/services/blog.service';
import { BlogListBlog } from '@/types/blog.types';
import { categoryService } from '@/services/category.service';
import { CategoryEntity } from '@/types/category.types';
import BlogCard from './BlogCard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowUp, Loader2, RefreshCw } from 'lucide-react';

const PAGE_SIZE = 10;

/**
 * Homepage feed with infinite scroll.
 *
 * Backend pagination contract (verified against live API):
 *   GET /blog?page&limit&category&search
 *   → { pagination: { totalCount, page, limit, pageCount }, blogs: [...] }
 * There is no hasNext flag; "has more" is derived as page < pageCount
 * (page = page number of the NEXT request to make, starting at 1).
 *
 * Root-cause notes for the previous broken version:
 * The sentinel div was only rendered AFTER the initial load finished, but the
 * IntersectionObserver effect ran once on mount — while the skeleton was still
 * showing and sentinelRef.current was null. The observer therefore never
 * attached to anything and page 2+ was never fetched. Fixed by re-attaching the
 * observer whenever the sentinel actually mounts (render-count key below).
 */
export default function BlogList() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedCategory = searchParams.get('category') || '';
  const filterKey = `cat:${selectedCategory}`;

  const categoriesQuery = useAsyncData(
    () => categoryService.list(1, 50),
    [],
    { errorMessage: '' }
  );
  const categories = categoriesQuery.data?.categories ?? [];

  // Feed state --------------------------------------------------------------
  // `page` = the NEXT page number to request (starts at 1; after page 1 loads
  // it becomes 2). `hasMore` derives from the ACTUAL backend response:
  // nextPage <= pageCount (pageCount = Math.ceil(totalCount / limit)).
  const [blogs, setBlogs] = useState<BlogListBlog[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [nextPage, setNextPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [feedDone, setFeedDone] = useState(false);

  // Epoch: bumped when the filter changes. Any response whose epoch differs
  // from the current one is stale and discarded.
  const [epoch, setEpoch] = useState(0);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setEpoch((e) => e + 1);
    setBlogs([]);
    setNextPage(1);
    setPageCount(1);
    setInitialLoading(true);
    setInitialError(null);
    setLoadMoreError(null);
    setLoadingMore(false);
    setFeedDone(false);
  }

  const requestIdRef = useRef(0);       // monotonic id — stale-response guard
  const inFlightRef = useRef(false);    // concurrent-request guard
  const fetchedPagesRef = useRef<Set<string>>(new Set()); // "epoch:page" — no double fetch

  // Fetcher ------------------------------------------------------------------
  const fetchPage = useCallback(async (targetPage: number, requestEpoch: number) => {
    const key = `${requestEpoch}:${targetPage}`;
    if (inFlightRef.current || fetchedPagesRef.current.has(key)) return;
    fetchedPagesRef.current.add(key);
    inFlightRef.current = true;

    const thisRequest = ++requestIdRef.current;
    const isFirst = targetPage === 1;
    if (isFirst) setInitialLoading(true);
    else setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const data: BlogListResponse = await blogService.list({
        page: targetPage,
        limit: PAGE_SIZE,
        category: selectedCategory || undefined,
      });
      // Stale if a newer request started OR the filter changed meanwhile.
      if (thisRequest !== requestIdRef.current || requestEpoch !== epoch) return;

      const freshIds = new Set(data.blogs.map((b) => b.id));
      setBlogs((prev) => {
        if (isFirst) return data.blogs;
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...data.blogs.filter((b) => !seen.has(b.id))];
      });
      setPageCount(data.pagination.pageCount);
      setNextPage(targetPage + 1);
      setInitialError(null);
      // End-of-feed: last page reached, OR backend returned an empty/short page.
      const lastPage = targetPage >= data.pagination.pageCount || data.blogs.length < PAGE_SIZE;
      if (lastPage || freshIds.size === 0) setFeedDone(true);
    } catch {
      if (thisRequest !== requestIdRef.current || requestEpoch !== epoch) return;
      fetchedPagesRef.current.delete(key); // allow retry of the failed page
      if (isFirst) setInitialError('خطا در بارگذاری مقالات');
      else setLoadMoreError('خطا در بارگذاری مقالات بیشتر');
    } finally {
      if (thisRequest === requestIdRef.current) {
        setInitialLoading(false);
        setLoadingMore(false);
        inFlightRef.current = false;
      }
    }
  }, [selectedCategory, epoch]);

  // Initial load (and reload after filter reset) -----------------------------
  const firstEpochRef = useRef(-1);
  useEffect(() => {
    if (firstEpochRef.current === epoch) return;
    firstEpochRef.current = epoch;
    void fetchPage(1, epoch);
  }, [epoch, fetchPage]);

  // IntersectionObserver sentinel -------------------------------------------
  // The sentinel is only rendered once real cards exist. This effect re-runs
  // whenever rendering switches between skeleton/feed states (loadStateKey), so
  // the observer attaches AFTER the sentinel is actually in the DOM.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadStateKey = initialLoading
    ? 'loading'
    : initialError
      ? 'error'
      : blogs.length === 0
        ? 'empty'
        : `feed-${blogs.length}`;

  useEffect(() => {
    if (loadStateKey === 'loading' || loadStateKey === 'error' || loadStateKey === 'empty') return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (inFlightRef.current || feedDone || loadMoreError) return;
        if (nextPage > pageCount) return;
        void fetchPage(nextPage, epoch);
      },
      { rootMargin: '600px 0px' } // start loading before the user reaches the bottom
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadStateKey, fetchPage, epoch, nextPage, pageCount, feedDone, loadMoreError]);

  const hasMore = !feedDone && nextPage <= pageCount;

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category) params.set('category', category);
    else params.delete('category');
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/');
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const retryLoadMore = () => {
    setLoadMoreError(null);
    fetchedPagesRef.current.delete(`${epoch}:${nextPage}`);
    void fetchPage(nextPage, epoch);
  };

  return (
    <div>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <CategoryChip active={!selectedCategory} onClick={() => handleCategoryChange('')}>همه</CategoryChip>
          {categories.map((cat: CategoryEntity) => (
            <CategoryChip
              key={cat.id}
              active={selectedCategory === cat.title}
              onClick={() => handleCategoryChange(cat.title)}
            >
              {cat.title}
            </CategoryChip>
          ))}
        </div>
      )}

      {/* Feed */}
      {initialLoading ? (
        <LoadingSkeleton type="card" />
      ) : initialError ? (
        <ErrorState
          message={initialError}
          onRetry={() => {
            setInitialError(null);
            fetchedPagesRef.current.clear();
            setNextPage(1);
            fetchPage(1, epoch);
          }}
        />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="مقاله‌ای یافت نشد"
          description={selectedCategory ? 'در این دسته‌بندی مقاله‌ای نیست' : 'به‌زودی مقالات جدید اینجا منتشر می‌شوند'}
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>

          {/* Sentinel: must stay in the DOM while the feed renders */}
          <div ref={sentinelRef} aria-hidden className="h-1" />

          <div className="py-8 flex flex-col items-center gap-3">
            {loadingMore && (
              <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال بارگذاری مقالات بیشتر...
              </span>
            )}

            {loadMoreError && !loadingMore && (
              <>
                <p className="text-sm" style={{ color: 'var(--error)' }}>{loadMoreError}</p>
                <Button variant="outline" size="sm" onClick={retryLoadMore}>
                  <RefreshCw className="h-4 w-4 ml-1.5" />
                  تلاش مجدد
                </Button>
              </>
            )}

            {!loadingMore && !loadMoreError && !hasMore && (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                — به پایان مقالات رسیدید —
              </p>
            )}

            {blogs.length >= 6 && (
              <button
                onClick={scrollToTop}
                className="mt-2 flex items-center gap-1.5 text-xs hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="بازگشت به بالای صفحه"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                بازگشت به بالا
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
      style={
        active
          ? { background: 'var(--primary)', color: 'var(--primary-text)' }
          : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
      }
    >
      {children}
    </button>
  );
}
