'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { blogService } from '@/services/blog.service';
import { categoryService } from '@/services/category.service';
import { BlogListBlog } from '@/types/blog.types';
import { CategoryEntity } from '@/types/category.types';
import { useDebounce } from '@/hooks/useDebounce';
import BlogCard from '@/components/blog/BlogCard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Search } from 'lucide-react';

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [blogs, setBlogs] = useState<BlogListBlog[]>([]);
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageCount: 1, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 500);
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  useEffect(() => {
    categoryService.list(1, 50).then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const data = await blogService.list({
          page,
          limit: 10,
          search: debouncedQuery || undefined,
          category: selectedCategory || undefined,
        });
        setBlogs(data.blogs);
        setPagination(data.pagination);
      } catch {} finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [debouncedQuery, selectedCategory, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCategory) params.set('category', selectedCategory);
    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', newPage.toString());
    }
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>جستجو</h1>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در مقالات..."
              className="w-full pr-10 pl-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            />
          </div>
        </form>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? ''
                  : 'border'
              }`}
              style={
                !selectedCategory
                  ? { background: 'var(--primary)', color: 'var(--primary-text)' }
                  : { background: 'var(--surface)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }
              }
            >
              همه
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.title)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.title
                    ? ''
                    : 'border'
                }`}
                style={
                  selectedCategory === cat.title
                    ? { background: 'var(--primary)', color: 'var(--primary-text)' }
                    : { background: 'var(--surface)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }
                }
              >
                {cat.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton type="card" />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="نتیجه‌ای یافت نشد"
          description="با کلمات کلیدی دیگری جستجو کنید"
        />
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {pagination.totalCount} نتیجه یافت شد
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={page}
              pageCount={pagination.pageCount}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
