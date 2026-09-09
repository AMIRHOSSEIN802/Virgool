'use client';

import Link from 'next/link';
import { BlogListBlog } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { formatDate, toPersianDigits } from '@/lib/utils';
import { Clock, Heart, MessageCircle, Loader2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Image from 'next/image';
import { useBlogLike } from '@/hooks/useBlogLike';
import { useRouter } from 'next/navigation';

interface BlogCardProps {
  blog: BlogListBlog;
  /** Like state reported back to the list owner (e.g. for infinite-scroll sync). */
  onLikeChange?: (blogId: number, liked: boolean, count: number) => void;
}

export default function BlogCard({ blog, onLikeChange }: BlogCardProps) {
  const router = useRouter();
  const authorName = blog.author?.profile?.nick_name || blog.author?.username || 'نویسنده';
  const authorImage =
    (blog.author as { profile?: { image_profile?: string | null } })?.profile?.image_profile ?? null;
  const categories = blog.categories?.map((c) => c.category?.title).filter(Boolean) || [];
  const readMinutes = Number(blog.time_for_study) || 1;

  const like = useBlogLike({
    blogId: blog.id,
    initialLiked: blog.isLiked,
    initialCount: blog.likeCount,
    onRequireAuth: () =>
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`),
    onLikeChange,
  });

  const blogHref = `/blog/${encodeURIComponent(blog.slug)}`;

  return (
    <article
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {blog.image && (
        <Link href={blogHref} className="block overflow-hidden">
          <div className="relative h-44 overflow-hidden">
            <Image
              src={getImageUrl(blog.image)}
              alt={blog.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {categories.slice(0, 3).map((cat) => (
              <Link
                key={cat}
                href={`/?category=${encodeURIComponent(cat ?? '')}`}
                className="px-2.5 py-0.5 text-xs font-medium rounded-full transition-opacity hover:opacity-85"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="mb-2">
          <Link
            href={blogHref}
            className="text-base sm:text-lg font-bold leading-8 line-clamp-2 transition-colors group-hover:text-[var(--primary)]"
            style={{ color: 'var(--text-primary)' }}
          >
            {blog.title}
          </Link>
        </h2>

        {/* Description */}
        <p className="text-sm leading-7 mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {blog.description}
        </p>

        {/* Footer: author + meta */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href={`/profile/${blog.author?.username}`}
            className="flex items-center gap-2 min-w-0 hover:opacity-85"
            aria-label={`پروفایل ${authorName}`}
          >
            <Avatar src={authorImage} alt={authorName} size="sm" fallback={authorName} />
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {authorName}
              </span>
              <span className="block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {formatDate(blog.created_at)}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1" title="زمان مطالعه">
              <Clock className="h-3.5 w-3.5" />
              {toPersianDigits(readMinutes)}
            </span>

            {/* Like button — direct action, no navigation */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                like.toggle();
              }}
              disabled={like.isPending}
              aria-pressed={like.hasKnownState ? like.liked : undefined}
              aria-label={like.liked ? 'برداشتن لایک' : 'لایک کردن مقاله'}
              title={like.liked ? 'برداشتن لایک' : 'لایک'}
              className="flex items-center gap-1 px-1.5 py-1 rounded-full transition-all active:scale-90 disabled:opacity-60 hover:bg-[var(--secondary)]"
              style={
                like.liked
                  ? { color: 'var(--error)' }
                  : { color: 'var(--text-tertiary)' }
              }
            >
              {like.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Heart className={`h-3.5 w-3.5 ${like.liked ? 'fill-current' : ''}`} />
              )}
              <span>{toPersianDigits(like.count)}</span>
            </button>

            {blog.commentCount !== undefined && (
              <Link
                href={blogHref}
                className="flex items-center gap-0.5 px-1 py-1 rounded-full hover:bg-[var(--secondary)]"
                title="نظرات"
                aria-label={`مشاهده نظرات (${blog.commentCount})`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {toPersianDigits(blog.commentCount)}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
