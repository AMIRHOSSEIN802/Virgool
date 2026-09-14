'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { commentService } from '@/services/comment.service';
import { CommentEntity } from '@/types/blog.types';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminTabs from '@/components/admin/AdminTabs';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { formatDate, toPersianDigits } from '@/lib/utils';
import { Check, MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'accepted' | 'rejected';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'accepted', label: 'تاییدشده' },
  { value: 'rejected', label: 'ردشده' },
];

/**
 * Admin comment moderation (/admin/comments).
 * URL is the source of truth (?status=&page=). Accept/Reject reuse the same
 * backend endpoints as the blog-page moderation (PUT /blog-comment/accept|
 * reject/:id — backend enforces admin/blog-owner authorization; this UI is
 * admin-only via AuthGuard + the admin API guard). Optimistic + rollback,
 * same pattern as CommentItem.
 */
function AdminCommentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') || 'all') as StatusFilter;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Optimistic overlay on top of the server list: id → desired accepted value
  // while a request is in flight, cleared/rolled back on its result.
  const [pending, setPending] = useState<Map<number, boolean>>(new Map());

  const commentsQuery = useAsyncData(
    () =>
      commentService.list(
        page,
        10,
        status === 'all' ? undefined : status,
      ),
    [status, page],
    { errorMessage: 'خطا در بارگذاری نظرها' }
  );

  const buildUrl = (s: StatusFilter, p: number) => {
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/admin/comments?${qs}` : '/admin/comments';
  };

  const moderate = async (comment: CommentEntity, action: 'accept' | 'reject') => {
    if (pending.has(comment.id)) return; // one action per comment at a time
    const nextAccepted = action === 'accept';
    setPending((prev) => new Map(prev).set(comment.id, nextAccepted));
    try {
      await commentService[action](comment.id);
      toast.success(action === 'accept' ? 'نظر تایید شد' : 'نظر رد شد');
      commentsQuery.refetch();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در تعدیل نظر');
    } finally {
      setPending((prev) => {
        const next = new Map(prev);
        next.delete(comment.id);
        return next;
      });
    }
  };

  const comments = commentsQuery.data?.comments ?? [];
  const pagination = commentsQuery.data?.pagination;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
          <MessageCircle className="h-6 w-6" style={{ color: 'var(--primary)' }} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>تعدیل نظرها</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>تایید یا رد نظرات ثبت‌شده روی مقالات</p>
        </div>
      </div>

      <AdminTabs />

      <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit" style={{ background: 'var(--secondary)' }} role="group" aria-label="فیلتر وضعیت">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => router.push(buildUrl(opt.value, 1))}
            aria-pressed={status === opt.value}
            className="px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={
              status === opt.value
                ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
                : { color: 'var(--text-tertiary)' }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {commentsQuery.isLoading ? (
        <LoadingSkeleton type="list" />
      ) : commentsQuery.error ? (
        <ErrorState message={commentsQuery.error} onRetry={commentsQuery.refetch} />
      ) : comments.length === 0 ? (
        <EmptyState
          title="نظری یافت نشد"
          description={status === 'rejected' ? 'هنوز نظری رد نشده است.' : status === 'accepted' ? 'نظر تاییدشده‌ای وجود ندارد.' : 'هنوز نظری ثبت نشده است.'}
        />
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {toPersianDigits(pagination?.totalCount ?? 0)} نظر
          </p>
          <div className="space-y-3">
            {comments.map((comment: CommentEntity) => {
              const effAccepted = pending.has(comment.id) ? pending.get(comment.id)! : comment.accepted;
              const isBusy = pending.has(comment.id);
              return (
                <div
                  key={comment.id}
                  className="p-4 rounded-2xl"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRight: `3px solid ${effAccepted ? 'var(--success)' : 'var(--error)'}`,
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {comment.user?.profile?.nick_name || comment.user?.username || 'کاربر'}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                        روی مقاله: {comment.blog?.title || '—'}
                        <span aria-hidden> · </span>
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-2.5 py-1 text-xs rounded-full font-medium"
                        style={
                          effAccepted
                            ? { background: 'var(--success-light)', color: 'var(--success)' }
                            : { background: 'var(--error-light)', color: 'var(--error)' }
                        }
                      >
                        {isBusy ? 'در حال ذخیره…' : effAccepted ? 'تاییدشده' : 'ردشده'}
                      </span>
                      {effAccepted ? (
                        <button
                          onClick={() => void moderate(comment, 'reject')}
                          disabled={isBusy}
                          aria-label="رد نظر"
                          title="رد نظر"
                          className="p-1.5 rounded-full transition-all disabled:opacity-50"
                          style={{ background: 'var(--secondary)', color: 'var(--error)' }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => void moderate(comment, 'accept')}
                          disabled={isBusy}
                          aria-label="تایید نظر"
                          title="تایید نظر"
                          className="p-1.5 rounded-full transition-all disabled:opacity-50"
                          style={{ background: 'var(--secondary)', color: 'var(--success)' }}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed break-words" style={{ color: 'var(--text-secondary)' }}>
                    {comment.text}
                  </p>
                </div>
              );
            })}
          </div>
          {pagination && pagination.pageCount > 1 && (
            <div className="mt-6">
              <Pagination
                page={page}
                pageCount={pagination.pageCount}
                onPageChange={(p) => router.push(buildUrl(status, p))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminCommentsPage() {
  return (
    <AuthGuard requireAdmin>
      <Suspense fallback={<LoadingSkeleton type="list" />}>
        <AdminCommentsContent />
      </Suspense>
    </AuthGuard>
  );
}
