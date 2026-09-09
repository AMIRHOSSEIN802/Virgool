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
}

/**
 * Top-level comment list for the blog detail page.
 * `onRefresh` re-fetches the whole blog (comments included) — the parent owns
 * the single source of truth, so we never keep a second mutable copy here.
 * `canModerate` only controls UI visibility; the backend is the authority.
 */
export default function CommentList({
  blogId,
  comments,
  pagination,
  canModerate = false,
  onRefresh,
}: CommentListProps) {
  return (
    <section aria-label="نظرات">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <MessageSquare className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          نظرات ({toPersianDigits(pagination.totalCount)})
        </h3>
      </div>

      <CommentForm blogId={blogId} onCommentAdded={onRefresh} />

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
            onPageChange={() => {
              // Comment pagination is server-side via the blog query; refresh keeps page 1
              // until the detail endpoint exposes a page param — backend contract unchanged.
              onRefresh?.();
            }}
          />
        </div>
      )}
    </section>
  );
}
