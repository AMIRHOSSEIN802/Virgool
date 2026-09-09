'use client';

import { useState } from 'react';
import { CommentEntity } from '@/types/blog.types';
import { formatDate, toPersianDigits } from '@/lib/utils';
import { commentService } from '@/services/comment.service';
import CommentForm from './CommentForm';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import { MessageCircle, Check, X, Loader2 } from 'lucide-react';

interface CommentItemProps {
  comment: CommentEntity;
  blogId: number;
  depth?: number;
  /** True when the viewer is the blog author or an Admin — shows moderation controls. */
  canModerate?: boolean;
  onCommentAdded?: () => void;
}

/**
 * A single comment (with nested replies).
 * Moderation (accept/reject) is available when `canModerate` is true — the UI
 * flag only hides controls; the backend enforces author/admin authorization
 * (403 for anyone else).
 */
export default function CommentItem({
  comment,
  blogId,
  depth = 0,
  canModerate = false,
  onCommentAdded,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showChildren, setShowChildren] = useState(true);
  const [accepted, setAccepted] = useState(comment.accepted);
  const [modBusy, setModBusy] = useState<'accept' | 'reject' | null>(null);

  const authorName = comment.user?.profile?.nick_name || comment.user?.username || 'کاربر';
  const children = comment.children ?? [];

  // Adopt refreshed server state when the parent re-fetches.
  const [lastAdopted, setLastAdopted] = useState<string | null>(
    `${comment.id}:${comment.accepted}`
  );
  const incoming = `${comment.id}:${comment.accepted}`;
  if (lastAdopted !== incoming) {
    setLastAdopted(incoming);
    setAccepted(comment.accepted);
  }

  const moderate = async (action: 'accept' | 'reject') => {
    if (modBusy) return;
    setModBusy(action);
    // Optimistic: apply immediately, roll back on failure.
    const prev = accepted;
    setAccepted(action === 'accept');
    try {
      await commentService[action](comment.id);
      toast.success(action === 'accept' ? 'نظر تایید شد' : 'نظر رد شد');
    } catch {
      setAccepted(prev);
      toast.error('خطا در تعدیل نظر');
    } finally {
      setModBusy(null);
    }
  };

  return (
    <div className="py-4">
      <div className="flex gap-3">
        <Avatar src={null} alt={authorName} size="sm" fallback={authorName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{authorName}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(comment.created_at)}</span>
            {!accepted && (
              <span
                className="px-2 py-0.5 text-[11px] rounded-full font-medium"
                style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}
              >
                رد شده
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
            {comment.text}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {depth < 2 && (
              <button
                onClick={() => setShowReplyForm((v) => !v)}
                className="text-xs flex items-center gap-1 hover:opacity-80 font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                پاسخ
              </button>
            )}
            {children.length > 0 && (
              <button
                onClick={() => setShowChildren((v) => !v)}
                className="text-xs hover:opacity-80 font-medium"
                style={{ color: 'var(--primary)' }}
              >
                {showChildren ? 'مخفی کردن پاسخ‌ها' : `نمایش ${toPersianDigits(children.length)} پاسخ`}
              </button>
            )}

            {/* B5 moderation controls — visibility only; backend is the authority */}
            {canModerate && (
              <span className="flex items-center gap-1.5 mr-auto">
                {modBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--primary)' }} />
                ) : (
                  <>
                    <button
                      onClick={() => moderate('accept')}
                      disabled={accepted}
                      aria-label="تایید نظر"
                      title="تایید نظر"
                      className="p-1.5 rounded-full transition-all disabled:opacity-40"
                      style={{
                        color: accepted ? 'var(--success)' : 'var(--text-tertiary)',
                        background: 'var(--secondary)',
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moderate('reject')}
                      disabled={!accepted}
                      aria-label="رد نظر"
                      title="رد نظر"
                      className="p-1.5 rounded-full transition-all disabled:opacity-40"
                      style={{
                        color: !accepted ? 'var(--error)' : 'var(--text-tertiary)',
                        background: 'var(--secondary)',
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </span>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                blogId={blogId}
                parentId={comment.id}
                onCommentAdded={() => {
                  setShowReplyForm(false);
                  onCommentAdded?.();
                }}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {showChildren && children.length > 0 && (
            <div className="mt-3 mr-4 pr-4 space-y-1" style={{ borderRight: '2px solid var(--border)' }}>
              {children.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  blogId={blogId}
                  depth={depth + 1}
                  canModerate={canModerate}
                  onCommentAdded={onCommentAdded}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
