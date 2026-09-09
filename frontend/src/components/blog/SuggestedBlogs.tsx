'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SuggestedBlog } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { Clock, Heart, MessageCircle } from 'lucide-react';

interface SuggestedBlogsProps {
  blogs: SuggestedBlog[];
}

export default function SuggestedBlogs({ blogs }: SuggestedBlogsProps) {
  if (blogs.length === 0) return null;

  return (
    <div style={{ background: 'var(--surface)' }} className="rounded-xl p-5 shadow-sm">
      <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-bold mb-4">مقالات پیشنهادی</h3>
      <div className="space-y-4">
        {blogs.map((blog) => (
          <Link
            key={blog.id}
            href={`/blog/${blog.slug}`}
            className="flex gap-3 group"
          >
            {blog.image ? (
              <span className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 block">
                <Image
                  src={getImageUrl(blog.image)}
                  alt={blog.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
            ) : (
              <div style={{ background: 'var(--secondary)' }} className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span style={{ color: 'var(--text-tertiary)' }} className="text-2xl">📝</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4
                style={{ color: 'var(--text-primary)' }}
                className="text-sm font-medium line-clamp-2 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              >
                {blog.title}
              </h4>
              <div style={{ color: 'var(--text-tertiary)' }} className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {blog.time_for_study} دقیقه
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {blog.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {blog.comments}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
