'use client';

import { Bookmark, Share2, Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBlogLike } from '@/hooks/useBlogLike';
import { blogService } from '@/services/blog.service';
import { toPersianDigits } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

interface BlogActionsProps {
  blogId: number;
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  bookmarkCount: number;
}

/**
 * Like / bookmark / share bar on the blog detail page.
 * Like logic is shared with BlogCard via useBlogLike — one implementation.
 * Bookmark keeps its own local optimistic logic (detail-only concern).
 */
export default function BlogActions({
  blogId,
  isLiked,
  isBookmarked,
  likeCount,
  bookmarkCount,
}: BlogActionsProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const like = useBlogLike({
    blogId,
    initialLiked: isLiked,
    initialCount: likeCount,
    onRequireAuth: () => router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`),
  });

  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bmCount, setBmCount] = useState(bookmarkCount);
  const bmBusy = useRef(false);

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (bmBusy.current) return;
    const next = !bookmarked;
    setBookmarked(next);
    setBmCount((c) => Math.max(0, c + (next ? 1 : -1)));
    bmBusy.current = true;
    try {
      await blogService.toggleBookmark(blogId);
    } catch {
      setBookmarked(!next);
      setBmCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      bmBusy.current = false;
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const { default: toast } = await import('react-hot-toast');
      toast.success('لینک مقاله کپی شد');
    } catch {
      const { default: toast } = await import('react-hot-toast');
      toast.error('کپی لینک ناموفق بود');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={like.toggle}
        disabled={like.isPending}
        aria-pressed={like.liked}
        aria-label={like.liked ? 'برداشتن لایک' : 'لایک کردن'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
        style={
          like.liked
            ? { backgroundColor: 'var(--error-light)', color: 'var(--error)', border: '1px solid var(--error)' }
            : { backgroundColor: 'var(--secondary)', color: 'var(--text-secondary)', border: '1px solid transparent' }
        }
      >
        {like.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className={`h-5 w-5 ${like.liked ? 'fill-current' : ''}`} />
        )}
        <span>{toPersianDigits(like.count)}</span>
      </button>

      <button
        type="button"
        onClick={handleBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره مقاله'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
        style={
          bookmarked
            ? { backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)' }
            : { backgroundColor: 'var(--secondary)', color: 'var(--text-secondary)', border: '1px solid transparent' }
        }
      >
        <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
        <span>{toPersianDigits(bmCount)}</span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        aria-label="کپی لینک مقاله"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90"
        style={{ backgroundColor: 'var(--secondary)', color: 'var(--text-secondary)', border: '1px solid transparent' }}
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}
