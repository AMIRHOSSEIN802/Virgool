'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notificationService, NotificationItem, NotificationType } from '@/services/notification.service';
import AuthGuard from '@/components/auth/AuthGuard';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { formatDate } from '@/lib/utils';
import { Bell, Heart, MessageCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

/** Persian template per type — actor name interpolated as TEXT (never HTML). */
function messageFor(n: NotificationItem): string {
  const name = n.actor?.nick_name || n.actor?.username || 'کاربری';
  switch (n.type) {
    case 'follow':
      return `${name} شما را دنبال کرد`;
    case 'like':
      return `${name} مقاله شما را پسندید`;
    case 'comment':
      return `${name} روی مقاله شما نظر داد`;
    case 'reply':
      return `${name} به نظر شما پاسخ داد`;
    case 'comment_accepted':
      return 'نظر شما توسط نویسنده پذیرفته شد';
    case 'comment_rejected':
      return 'نظر شما توسط نویسنده رد شد';
    default:
      return 'رویداد جدید';
  }
}

function iconFor(type: NotificationType) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  switch (type) {
    case 'like':
      return <Heart className={cls} style={{ color: 'var(--error)' }} />;
    case 'comment':
    case 'reply':
    case 'comment_accepted':
    case 'comment_rejected':
      return <MessageCircle className={cls} style={{ color: 'var(--primary)' }} />;
    case 'follow':
      return <UserPlus className={cls} style={{ color: 'var(--success)' }} />;
    default:
      return <Bell className={cls} style={{ color: 'var(--text-tertiary)' }} />;
  }
}

/**
 * Target link per notification type using ONLY existing routes + real fields:
 * follow → actor public profile; blog events → blog detail by slug.
 * No slug (deleted blog) → no link (never invent /blog/:id).
 */
function hrefFor(n: NotificationItem): string | null {
  if (n.type === 'follow') return n.actor ? `/profile/${encodeURIComponent(n.actor.username)}` : null;
  return n.blogSlug ? `/blog/${encodeURIComponent(n.blogSlug)}` : null;
}

function NotificationsContent() {
  const [page, setPage] = useState(1);
  const { refresh: refreshBadge } = useUnreadCount();
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  const listQuery = useAsyncData(
    () => notificationService.list(page, 10),
    [page],
    { errorMessage: 'خطا در بارگذاری اعلان‌ها' }
  );

  const notifications = listQuery.data?.notifications ?? [];
  const pagination = listQuery.data?.pagination;

  /** Optimistic read-mark (server persists; rollback on failure). */
  const markRead = async (n: NotificationItem) => {
    if (n.isRead || readIds.has(n.id)) return;
    setReadIds((prev) => new Set(prev).add(n.id));
    try {
      await notificationService.markRead(n.id);
      refreshBadge();
    } catch {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(n.id);
        return next;
      });
      toast.error('خطا در خوانده‌شدن اعلان');
    }
  };

  const [markingAll, setMarkingAll] = useState(false);
  const hasUnread = notifications.some((n) => !n.isRead && !readIds.has(n.id));
  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setReadIds(new Set(notifications.map((n) => n.id)));
      toast.success('همه اعلان‌ها خوانده شد');
      listQuery.refetch();
      refreshBadge();
    } catch {
      toast.error('خطا در خواندن اعلان‌ها');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
          <Bell className="h-6 w-6" style={{ color: 'var(--primary)' }} />
          اعلان‌ها
        </h1>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={markAll} isLoading={markingAll}>
            خواندن همه
          </Button>
        )}
      </div>

      {listQuery.isLoading ? (
        <LoadingSkeleton type="list" />
      ) : listQuery.error ? (
        <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="اعلانی وجود ندارد"
          description="وقتی کسی شما را دنبال کند، مقاله‌تان را بپسندد یا نظر دهد، اینجا می‌بینید."
          icon={<Bell className="h-12 w-12" />}
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const isRead = n.isRead || readIds.has(n.id);
            const href = hrefFor(n);
            const body = (
              <div
                className={`flex items-start gap-3 p-3.5 rounded-2xl transition-colors ${href ? 'hover:bg-[var(--surface-hover)]' : ''}`}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isRead ? 'var(--border)' : 'var(--primary)'}`,
                  opacity: isRead ? 0.75 : 1,
                }}
              >
                {n.actor ? (
                  <Avatar src={n.actor.image_profile} alt={n.actor.nick_name || n.actor.username} size="md" fallback={n.actor.nick_name || n.actor.username} />
                ) : (
                  <span className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--secondary)' }}>
                    {iconFor(n.type)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-6 break-words" style={{ color: 'var(--text-primary)' }}>
                    <span className="inline-flex items-center gap-1 me-1">{iconFor(n.type)}</span>
                    {messageFor(n)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDate(n.created_at)}
                    {!isRead && <span className="inline-block w-2 h-2 rounded-full align-middle me-1.5" style={{ background: 'var(--primary)' }} aria-label="خوانده‌نشده" />}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {href ? (
                  <Link href={href} onClick={() => void markRead(n)} aria-label={`${messageFor(n)} — مشاهده`}>
                    {body}
                  </Link>
                ) : (
                  <div>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pagination && pagination.pageCount > 1 && (
        <div className="mt-6">
          <Pagination page={page} pageCount={pagination.pageCount} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
