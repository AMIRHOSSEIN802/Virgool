'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { blogService } from '@/services/blog.service';
import { BlogDetailResponse } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import BlogActions from '@/components/blog/BlogActions';
import SuggestedBlogs from '@/components/blog/SuggestedBlogs';
import CommentList from '@/components/comment/CommentList';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<BlogDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await blogService.getBySlug(slug);
      setData(result);
    } catch {
      setError('مقاله یافت نشد');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  const handleRefresh = () => {
    fetchBlog();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'مقاله یافت نشد'} onRetry={fetchBlog} />;
  }

  const { blog, isLiked, isBookmarked, commentsData, suggestBlogs } = data;
  const authorName = blog.author?.profile?.nick_name || blog.author?.username || '';
  const categories = blog.categories?.map((c) => c.category?.title).filter(Boolean) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <article className="lg:col-span-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </button>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 text-sm font-medium rounded-full"
                  style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {blog.title}
          </h1>

          {/* Author Info */}
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/profile/${blog.author?.username}`}>
              <Avatar
                src={null}
                alt={authorName}
                size="md"
                fallback={authorName}
              />
            </Link>
            <div>
              <Link
                href={`/profile/${blog.author?.username}`}
                className="text-sm font-medium"
                style={{ color: 'var(--primary)' }}
              >
                {authorName}
              </Link>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>{formatDate(blog.created_at)}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {blog.time_for_study} دقیقه خواندن
                </span>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {blog.image && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img
                src={getImageUrl(blog.image)}
                alt={blog.title}
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {/* Description */}
          <p className="text-lg mb-6 leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
            {blog.description}
          </p>

          {/* Content */}
          <div
            className="blog-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Actions */}
          <div className="mt-8 pt-6" style={{ borderColor: 'var(--border)', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
            <BlogActions
              blogId={blog.id}
              isLiked={isLiked}
              isBookmarked={isBookmarked}
              likeCount={blog.likeCount || 0}
              bookmarkCount={blog.bookmarkCount || 0}
            />
          </div>

          {/* Comments */}
          <div className="mt-8 pt-6" style={{ borderColor: 'var(--border)', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
            <CommentList
              blogId={blog.id}
              comments={commentsData.comments}
              pagination={commentsData.pagination}
              onRefresh={handleRefresh}
            />
          </div>
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {/* Author Card */}
            <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--surface)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>درباره نویسنده</h3>
              <Link href={`/profile/${blog.author?.username}`} className="flex items-center gap-3">
                <Avatar
                  src={null}
                  alt={authorName}
                  size="lg"
                  fallback={authorName}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{authorName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{blog.author?.username}</p>
                </div>
              </Link>
            </div>

            {/* Suggested Blogs */}
            <SuggestedBlogs blogs={suggestBlogs} />
          </div>
        </aside>
      </div>
    </div>
  );
}
