'use client';

import { blogService } from '@/services/blog.service';
import { categoryService } from '@/services/category.service';
import { CategoryEntity } from '@/types/category.types';
import BlogCard from '@/components/blog/BlogCard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

/**
 * Search page content.
 * - Query state is synced with the URL (?q=&category=&page=) so results are shareable.
 * - Data loading via useAsyncData: stale responses discarded, no setState-in-effect.
 * - Same `search` query param contract as the homepage feed (backend: GET /blog?search=...).
 */
export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const selectedCategory = searchParams.get('category') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const debouncedQuery = useDebounce(query, 400);

  // Keep the URL in sync with the live (debounced) query without full navigation.
  const [lastSynced, setLastSynced] = useState(() =>
    JSON.stringify({ q: initialQuery, category: selectedCategory, page })
  );
  const currentSync = JSON.stringify({ q: debouncedQuery.trim(), category: selectedCategory, page });
  if (currentSync !== lastSynced) {
    setLastSynced(currentSync);
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  }

  const resultsQuery = useAsyncData(
    () =>
      blogService.list({
        page,
        limit: 10,
        search: debouncedQuery.trim() || undefined,
        category: selectedCategory || undefined,
      }),
    [debouncedQuery, selectedCategory, page],
    { errorMessage: 'خطا در جستجو' }
  );

  const categoriesQuery = useAsyncData(() => categoryService.list(1, 50), [], { errorMessage: '' });
  const categories = categoriesQuery.data?.categories ?? [];

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) params.delete('page');
    else params.set('page', newPage.toString());
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const blogs = resultsQuery.data?.blogs ?? [];
  const pagination = resultsQuery.data?.pagination;
  const hasSearched = resultsQuery.data !== null;
  const totalCount = pagination?.totalCount ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>جستجو در مقالات</h1>
        <div className="relative max-w-2xl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="عنوان، متن یا موضوع مقاله..."
            aria-label="جستجو در مقالات"
            className="w-full pr-12 pl-11 py-3.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="پاک کردن جستجو"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:opacity-80"
              style={{ color: 'var(--text-tertiary)', background: 'var(--secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            <CategoryChip active={!selectedCategory} onClick={() => {}}>
              همه
            </CategoryChip>
            {categories.map((cat: CategoryEntity) => (
              <CategoryChip
                key={cat.id}
                active={selectedCategory === cat.title}
                onClick={() => {}}
              >
                {cat.title}
              </CategoryChip>
            ))}
          </div>
        )}
      </div>

      {resultsQuery.isLoading ? (
        <LoadingSkeleton type="card" />
      ) : resultsQuery.error ? (
        <ErrorState message={resultsQuery.error} onRetry={resultsQuery.refetch} />
      ) : blogs.length === 0 ? (
        <EmptyState
          title={hasSearched ? 'نتیجه‌ای یافت نشد' : 'جستجو را شروع کنید'}
          description={
            hasSearched
              ? 'با کلمات کلیدی دیگری جستجو کنید یا دسته‌بندی را تغییر دهید'
              : 'برای یافتن مقالات مورد نظر، عبارتی را جستجو کنید'
          }
        />
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {totalCount} نتیجه یافت شد
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
          {pagination && pagination.pageCount > 1 && (
            <div className="mt-8">
              <Pagination page={page} pageCount={pagination.pageCount} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';

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
