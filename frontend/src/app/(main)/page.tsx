import BlogList from '@/components/blog/BlogList';
import { Suspense } from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
          تازه‌ترین مقالات
        </h1>
        <p className="text-sm sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
          جدیدترین نوشته‌های ویرگولی‌ها را بخوانید
        </p>
      </div>
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <BlogList />
      </Suspense>
    </div>
  );
}
