'use client';

import Link from 'next/link';
import { BlogListBlog } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { formatDate, truncateText } from '@/lib/utils';
import { Clock, Heart, MessageCircle, Bookmark } from 'lucide-react';

interface BlogCardProps {
  blog: BlogListBlog;
}

export default function BlogCard({ blog }: BlogCardProps) {
  const authorName = blog.author?.profile?.nick_name || blog.author?.username || '';
  const categories = blog.categories?.map((c) => c.category?.title).filter(Boolean) || [];

  return (
    <article
      className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
      style={{ background: 'var(--surface)' }}
    >
      {blog.image && (
        <Link href={`/blog/${blog.slug}`}>
          <div className="relative h-48 overflow-hidden">
            <img
              src={getImageUrl(blog.image)}
              alt={blog.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}
      <div className="p-5">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="px-2.5 py-0.5 text-xs font-medium rounded-full"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <Link href={`/blog/${blog.slug}`}>
          <h2
            className="text-lg font-bold mb-2 transition-colors line-clamp-2"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          >
            {blog.title}
          </h2>
        </Link>

        {/* Description */}
        <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {truncateText(blog.description, 150)}
        </p>

        {/* Author & Meta */}
        <div className="flex items-center justify-between">
          <Link href={`/profile/${blog.author?.username}`} className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {authorName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{authorName}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(blog.created_at)}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {blog.time_for_study} دقیقه
            </span>
            {blog.likeCount !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {blog.likeCount}
              </span>
            )}
            {blog.commentCount !== undefined && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {blog.commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
