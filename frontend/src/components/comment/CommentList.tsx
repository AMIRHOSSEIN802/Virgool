'use client';

import { CommentEntity } from '@/types/blog.types';
import { toPersianDigits } from '@/lib/utils';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { MessageSquare } from 'lucide-react';

interface CommentListProps {
  blogId: number;
  comments: CommentEntity[];
  pagination: {
    page: number;
    pageCount: number;
    totalCount: number;
  };
  /** True when the viewer is the blog author or an Admin. */
  canModerate?: boolean;
  onRefresh?: () => void;
  /** Change the server-side page of top-level comments. */
  onPageChange: (page: number) => void;
}

/**
 * Top-level comment list for the blog detail page.
 * `onRefresh` re-fetches the whole blog (comments included) — the parent owns
 * the single source of truth, so we never keep a second mutable copy here.
 * Pagination is server-side: `onPageChange` sets the page the parent requests
 * from GET /blog/by-slug/:slug?page=N (comments REPLACE, never append).
 * `canModerate` only controls UI visibility; the backend is the authority.
 */
export default function CommentList({
  blogId,
  comments,
  pagination,
  canModerate = false,
  onRefresh,
  onPageChange,
}: CommentListProps) {
  return (
    <section aria-label="نظرات">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <MessageSquare className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          نظرات ({toPersianDigits(pagination.totalCount)})
        </h3>
      </div>

      <CommentForm
        blogId={blogId}
        onCommentAdded={() => {
          // A new top-level comment lands on page 1 (order: id DESC) — show it.
          onPageChange(1);
          onRefresh?.();
        }}
      />

      <div className="mt-4">
        {comments.length === 0 ? (
          <EmptyState
            title="هنوز نظری ثبت نشده"
            description="اولین نفری باشید که نظر می‌دهد"
            icon={<MessageSquare className="h-12 w-12" />}
          />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {comments.map((comment) => (
              <div key={comment.id} style={{ borderColor: 'var(--border)' }}>
                <CommentItem
                  comment={comment}
                  blogId={blogId}
                  canModerate={canModerate}
                  onCommentAdded={onRefresh}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination.pageCount > 1 && (
        <div className="mt-6">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </section>
  );
}
