'use client';

import { useState } from 'react';
import { blogService } from '@/services/blog.service';
import { categoryService } from '@/services/category.service';
import { CategoryEntity } from '@/types/category.types';
import BlogCard from '@/components/blog/BlogCard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { toPersianDigits } from '@/lib/utils';

/**
 * Search page content — URL is the single source of truth.
 * ?q=&category=&page= drive everything: refresh, direct links and Back/Forward
 * all restore the exact state. Search is an explicit submit (form), matching
 * the Header search pattern; no live-search/debounce requests.
 */
export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // The input mirrors the URL; local state exists only to capture typing
  // between submits (URL updates on submit / clear / chip click).
  const [query, setQuery] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setQuery(q);
  }

  const buildUrl = (overrides: { q?: string; category?: string; page?: number }) => {
    const next = {
      q: overrides.q !== undefined ? overrides.q : q,
      category: overrides.category !== undefined ? overrides.category : selectedCategory,
      page: overrides.page !== undefined ? overrides.page : page,
    };
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.category) params.set('category', next.category);
    if (next.page > 1) params.set('page', String(next.page));
    const qs = params.toString();
    return qs ? `/search?${qs}` : '/search';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setQuery(trimmed);
    // A new search always starts from page 1.
    router.push(buildUrl({ q: trimmed, page: 1 }));
  };

  const handleClear = () => {
    setQuery('');
    router.push(buildUrl({ q: '', page: 1 }));
  };

  const handleCategory = (title: string) => {
    // Selecting a category resets the page, preserves q; "همه" removes it.
    router.push(buildUrl({ category: title, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    router.push(buildUrl({ page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resultsQuery = useAsyncData(
    () =>
      blogService.list({
        page,
        limit: 12,
        search: q || undefined,
        category: selectedCategory || undefined,
      }),
    [q, selectedCategory, page],
    { errorMessage: 'خطا در جستجو' }
  );

  const categoriesQuery = useAsyncData(() => categoryService.list(1, 50), [], { errorMessage: '' });
  const categories = categoriesQuery.data?.categories ?? [];

  const blogs = resultsQuery.data?.blogs ?? [];
  const pagination = resultsQuery.data?.pagination;
  const totalCount = pagination?.totalCount ?? 0;

  // Empty state wording reflects the ACTUAL situation, never an error UI.
  const emptyCopy = (() => {
    if (q && selectedCategory)
      return {
        title: 'نتیجه‌ای یافت نشد',
        description: `مقاله‌ای با «${q}» در دستهٔ «${selectedCategory}» پیدا نشد؛ عبارت یا دستهٔ دیگری را امتحان کنید.`,
      };
    if (q)
      return {
        title: 'نتیجه‌ای یافت نشد',
        description: `مقاله‌ای با عبارت «${q}» پیدا نشد. با کلمات کلیدی دیگری جستجو کنید.`,
      };
    if (selectedCategory)
      return {
        title: 'مقاله‌ای در این دسته نیست',
        description: `هنوز مقاله‌ای در دستهٔ «${selectedCategory}» منتشر نشده است.`,
      };
    return {
      title: 'جستجو را شروع کنید',
      description: 'برای یافتن مقالات مورد نظر، عبارتی را جستجو کنید یا دسته‌بندی را انتخاب کنید.',
    };
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          جستجو در مقالات
        </h1>
        <form onSubmit={handleSubmit} className="relative max-w-2xl" role="search">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="عنوان یا خلاصه مقاله را جستجو کنید..."
            aria-label="جستجو در مقالات"
            className="w-full pr-12 pl-11 py-3.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="پاک کردن جستجو"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:opacity-80"
              style={{ color: 'var(--text-tertiary)', background: 'var(--secondary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5" role="group" aria-label="فیلتر دسته‌بندی">
            <CategoryChip
              active={!selectedCategory}
              onClick={() => handleCategory('')}
            >
              همه
            </CategoryChip>
            {categories.map((cat: CategoryEntity) => (
              <CategoryChip
                key={cat.id}
                active={selectedCategory === cat.title}
                onClick={() => handleCategory(cat.title)}
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
        <EmptyState title={emptyCopy.title} description={emptyCopy.description} icon={<Search className="h-12 w-12" />} />
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {toPersianDigits(totalCount)} مقاله پیدا شد
            {q && ` برای «${q}»`}
            {selectedCategory && ` در دستهٔ «${selectedCategory}»`}
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
      type="button"
      aria-pressed={active}
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
