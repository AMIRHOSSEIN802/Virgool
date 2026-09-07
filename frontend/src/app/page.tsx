import BlogList from '@/components/blog/BlogList';
import { Suspense } from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          مقالات اخیر
        </h1>
        <p style={{ color: 'var(--text-tertiary)' }}>جدیدترین مقالات منتشر شده در ویرگول</p>
      </div>
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <BlogList />
      </Suspense>
    </div>
  );
}
