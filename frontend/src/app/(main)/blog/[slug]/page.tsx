'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { blogService } from '@/services/blog.service';
import { BlogDetailResponse } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { formatDate, formatNumber, toPersianDigits } from '@/lib/utils';
import BlogActions from '@/components/blog/BlogActions';
import SuggestedBlogs from '@/components/blog/SuggestedBlogs';
import CommentList from '@/components/comment/CommentList';
import Avatar from '@/components/ui/Avatar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';

/**
 * Blog detail page.
 * `version` is bumped by comment actions to refetch the whole resource from the
 * single source of truth (the backend detail endpoint) — no second mutable copy.
 */
export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const { user: currentUser } = useAuth();

  const query = useAsyncData<BlogDetailResponse>(
    () => blogService.getBySlug(slug),
    [slug, version],
    { errorMessage: 'خطا در بارگذاری مقاله' }
  );

  if (query.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LoadingSkeleton type="article" />
      </div>
    );
  }

  if (query.status === 404) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ErrorState
          title="مقاله یافت نشد"
          message="مقاله‌ای که دنبال آن بودید وجود ندارد یا حذف شده است."
        />
        <div className="flex justify-center">
          <button onClick={() => router.push('/')} className="btn-outline">
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ErrorState message={query.error || 'مقاله یافت نشد'} onRetry={refresh} />
      </div>
    );
  }

  const { blog, isLiked, isBookmarked, commentsData, suggestBlogs } = query.data;
  // B5: the blog author (or an Admin) moderates comments on this blog.
  // Determined from the detail response's author.id and the session user — the
  // backend remains the authority (403 on unauthorized accept/reject).
  const canModerateComments =
    !!currentUser &&
    (currentUser.id === blog.author?.id || currentUser.role === 'admin');
  const authorName = blog.author?.profile?.nick_name || blog.author?.username || 'نویسنده';
  const authorImage = (blog.author as { profile?: { image_profile?: string | null } })?.profile
    ?.image_profile ?? null;
  const categories = blog.categories?.map((c) => c.category?.title).filter(Boolean) || [];
  const readMinutes = Number(blog.time_for_study) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <article className="lg:col-span-8 min-w-0">
          <nav aria-label="بالا" className="text-sm mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              بازگشت به مقالات
            </Link>
          </nav>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/?category=${encodeURIComponent(cat ?? '')}`}
                  className="px-3 py-1 text-xs font-medium rounded-full transition-opacity hover:opacity-85"
                  style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-5 leading-[1.6]" style={{ color: 'var(--text-primary)' }}>
            {blog.title}
          </h1>

          {/* Author Info */}
          <div className="flex items-center gap-3 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <Link href={`/profile/${blog.author?.username}`} className="shrink-0">
              <Avatar src={authorImage} alt={authorName} size="md" fallback={authorName} />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/profile/${blog.author?.username}`}
                className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {authorName}
              </Link>
              <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                <span>{formatDate(blog.created_at)}</span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {toPersianDigits(readMinutes)} دقیقه مطالعه
                </span>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {blog.image && getImageUrl(blog.image) && (
            <figure className="mb-8 rounded-2xl overflow-hidden relative h-64 sm:h-96" style={{ border: '1px solid var(--border)' }}>
              <Image
                src={getImageUrl(blog.image)!}
                alt={blog.title}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
                priority
              />
            </figure>
          )}

          {/* Description (lead) */}
          <p
            className="text-lg mb-8 leading-[2] font-medium rounded-xl p-4"
            style={{ color: 'var(--text-secondary)', background: 'var(--secondary)', borderRight: '3px solid var(--primary)' }}
          >
            {blog.description}
          </p>

          {/* Content */}
          <div
            className="blog-content max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Actions */}
          <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <BlogActions
              blogId={blog.id}
              isLiked={isLiked}
              isBookmarked={isBookmarked}
              likeCount={blog.likeCount || 0}
              bookmarkCount={blog.bookmarkCount || 0}
            />
          </div>

          {/* Comments */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <CommentList
              blogId={blog.id}
              comments={commentsData.comments}
              pagination={commentsData.pagination}
              onRefresh={refresh}
              canModerate={canModerateComments}
            />
          </div>
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {/* Author Card */}
            <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>نویسنده</h3>
              <Link href={`/profile/${blog.author?.username}`} className="flex items-center gap-3">
                <Avatar src={authorImage} alt={authorName} size="lg" fallback={authorName} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{authorName}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    @{blog.author?.username}
                  </p>
                </div>
              </Link>
              <Link
                href={`/profile/${blog.author?.username}`}
                className="mt-4 block text-center text-sm py-2 rounded-xl font-medium transition-colors hover:opacity-90"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                مشاهده پروفایل
              </Link>
            </div>

            {/* Stats */}
            <div className="rounded-2xl p-5 shadow-sm grid grid-cols-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatNumber(blog.likeCount || 0)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>پسندیده</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatNumber(blog.bookmarkCount || 0)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>ذخیره</p>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatNumber(commentsData.pagination.totalCount)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>نظر</p>
              </div>
            </div>

            {/* Suggested Blogs */}
            <SuggestedBlogs blogs={suggestBlogs} />
          </div>
        </aside>
      </div>

      {/* Mobile suggestions */}
      <div className="lg:hidden mt-10">
        <SuggestedBlogs blogs={suggestBlogs} />
      </div>
    </div>
  );
}
