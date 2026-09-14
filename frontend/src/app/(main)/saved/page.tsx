'use client';

import { useState } from 'react';
import { blogService } from '@/services/blog.service';
import { BlogListBlog } from '@/types/blog.types';
import BlogCard from '@/components/blog/BlogCard';
import AuthGuard from '@/components/auth/AuthGuard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';

function SavedContent() {
  const [page, setPage] = useState(1);

  const savedQuery = useAsyncData(
    () => blogService.myBookmarks(page),
    [page],
    { errorMessage: 'خطا در بارگذاری مقالات ذخیره‌شده' }
  );

  if (savedQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LoadingSkeleton type="list" />
      </div>
    );
  }

  if (savedQuery.error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ErrorState message={savedQuery.error} onRetry={savedQuery.refetch} />
      </div>
    );
  }

  const data = savedQuery.data;
  const blogs = data?.blogs ?? [];
  const pagination = data?.pagination;

  // Clamp to a valid page after data arrives: deleting the last items of the
  // final page (or opening an out-of-range page) must not leave the user on a
  // falsely-empty view — fall back to the real last page (render-time state
  // adjustment, the pattern used across this project).
  if (data && page > 1 && data.pagination.pageCount >= 1 && page > data.pagination.pageCount) {
    setPage(data.pagination.pageCount);
  }

  const handleUnsaved = (blogId: number) => {
    toast.success('از ذخیره‌شده‌ها حذف شد');
    // Optimistic: drop it from the visible list immediately. If it was the
    // last item on the current (non-first) page, step back so the user never
    // lands on a now-empty page; otherwise re-fetch to keep counts honest.
    const remaining = blogs.filter((b) => b.id !== blogId);
    if (remaining.length === 0 && page > 1) {
      setPage((p) => p - 1);
    } else {
      savedQuery.refetch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        مقالات ذخیره‌شده
      </h1>
      {blogs.length === 0 ? (
        <EmptyState
          title="هنوز مقاله‌ای ذخیره نکرده‌اید"
          description="برای دسترسی بعدی، روی دکمهٔ ذخیره (نشانگر) در انتهای هر مقاله بزنید تا اینجا نمایش داده شود."
          icon={<Bookmark className="h-12 w-12" />}
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {blogs.map((blog: BlogListBlog) => (
              <BlogCard key={blog.id} blog={blog} onUnsaved={handleUnsaved} />
            ))}
          </div>
          {pagination && pagination.pageCount > 1 && (
            <div className="mt-8">
              <Pagination
                page={pagination.page}
                pageCount={pagination.pageCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <AuthGuard>
      <SavedContent />
    </AuthGuard>
  );
}
