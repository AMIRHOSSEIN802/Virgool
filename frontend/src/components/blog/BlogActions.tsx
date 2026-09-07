'use client';

import { useState } from 'react';
import { Heart, Bookmark, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { blogService } from '@/services/blog.service';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface BlogActionsProps {
  blogId: number;
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  bookmarkCount: number;
}

export default function BlogActions({
  blogId,
  isLiked: initialLiked,
  isBookmarked: initialBookmarked,
  likeCount: initialLikeCount,
  bookmarkCount: initialBookmarkCount,
}: BlogActionsProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    try {
      await blogService.toggleLike(blogId);
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    } catch {
      toast.error('خطا در لایک مقاله');
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    try {
      await blogService.toggleBookmark(blogId);
      setBookmarked(!bookmarked);
      setBookmarkCount(bookmarked ? bookmarkCount - 1 : bookmarkCount + 1);
    } catch {
      toast.error('خطا در ذخیره مقاله');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('لینک کپی شد');
  };

  const baseButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s',
    border: '1px solid transparent',
  };

  const inactiveStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: 'var(--secondary)',
    color: 'var(--text-secondary)',
  };

  const likeActiveStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: 'var(--error-light)',
    color: 'var(--error)',
    borderColor: 'var(--error)',
  };

  const bookmarkActiveStyle: React.CSSProperties = {
    ...baseButtonStyle,
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    borderColor: 'var(--primary)',
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleLike}
        style={liked ? likeActiveStyle : inactiveStyle}
      >
        <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
        <span>{likeCount}</span>
      </button>
      <button
        onClick={handleBookmark}
        style={bookmarked ? bookmarkActiveStyle : inactiveStyle}
      >
        <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
        <span>{bookmarkCount}</span>
      </button>
      <button
        onClick={handleShare}
        style={inactiveStyle}
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  );
}
