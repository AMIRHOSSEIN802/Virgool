'use client';

import { useState, useEffect, useCallback } from 'react';
import { blogService } from '@/services/blog.service';
import { categoryService } from '@/services/category.service';
import { BlogListBlog } from '@/types/blog.types';
import { CategoryEntity } from '@/types/category.types';
import BlogCard from './BlogCard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useSearchParams, useRouter } from 'next/navigation';

export default function BlogList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [blogs, setBlogs] = useState<BlogListBlog[]>([]);
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || ''
  );

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await blogService.list({
        page,
        limit: 10,
        category: selectedCategory || undefined,
      });
      setBlogs(data.blogs);
      setPageCount(data.pagination.pageCount);
      setTotalCount(data.pagination.totalCount);
    } catch (err) {
      setError('خطا در بارگذاری مقالات');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryService.list(1, 50);
      setCategories(data.categories);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', newPage.toString());
    }
    router.push(`/?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return <ErrorState message={error} onRetry={fetchBlogs} />;
  }

  return (
    <div>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={
              !selectedCategory
                ? { background: 'var(--primary)', color: 'var(--primary-text)' }
                : { background: 'var(--secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
            }
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.title)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={
                selectedCategory === cat.title
                  ? { background: 'var(--primary)', color: 'var(--primary-text)' }
                  : { background: 'var(--secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* Blog List */}
      {isLoading ? (
        <LoadingSkeleton type="card" />
      ) : blogs.length === 0 ? (
        <EmptyState title="مقاله‌ای یافت نشد" description="هنوز مقاله‌ای منتشر نشده است" />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
