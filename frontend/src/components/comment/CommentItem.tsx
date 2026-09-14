'use client';

import { useState } from 'react';
import { CommentEntity } from '@/types/blog.types';
import { formatDate, toPersianDigits } from '@/lib/utils';
import { commentService } from '@/services/comment.service';
import CommentForm from './CommentForm';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { MessageCircle, Check, X, Loader2, Pencil, Trash2 } from 'lucide-react';

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
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showChildren, setShowChildren] = useState(true);
  const [accepted, setAccepted] = useState(comment.accepted);
  const [modBusy, setModBusy] = useState<'accept' | 'reject' | null>(null);

  // B7: author-only edit/delete. The backend enforces this too (403); hiding
  // the buttons here is presentation, not authorization.
  const isAuthor = !!user && !!user.id && comment.userId === user.id;

  const [text, setText] = useState(comment.text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Adopt refreshed server text when the parent re-fetches.
  const [lastTextId, setLastTextId] = useState(`${comment.id}:${comment.text}`);
  const incomingText = `${comment.id}:${comment.text}`;
  if (lastTextId !== incomingText) {
    setLastTextId(incomingText);
    setText(comment.text);
  }

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

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (trimmed.length < 5) {
      toast.error('متن نظر باید حداقل ۵ کاراکتر باشد');
      return;
    }
    if (saving) return; // guard double-submit
    setSaving(true);
    try {
      await commentService.update(comment.id, trimmed);
      setText(trimmed); // immediate UI update — no full reload needed
      setEditing(false);
      toast.success('نظر ویرایش شد');
      onCommentAdded?.(); // re-fetch current page (pagination page is preserved)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      toast.error((Array.isArray(message) ? message[0] : message) || 'خطا در ویرایش نظر');
    } finally {
      setSaving(false);
    }
  };

  const deleteComment = async () => {
    if (deleting) return; // guard double-click
    setDeleting(true);
    try {
      await commentService.remove(comment.id);
      toast.success('نظر حذف شد');
      setConfirmDelete(false);
      onCommentAdded?.(); // parent re-fetches the current page — no window.reload
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      toast.error((Array.isArray(message) ? message[0] : message) || 'خطا در حذف نظر');
    } finally {
      setDeleting(false);
    }
  };

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
          {editing ? (
            <div className="mb-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                rows={3}
                maxLength={2000}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={saveEdit} isLoading={saving} disabled={draft.trim().length < 5}>
                  ذخیره
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
              {text}
            </p>
          )}
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

            {/* B7 author actions — edit/delete own comment (backend enforces) */}
            {isAuthor && !editing && (
              <>
                <button
                  onClick={startEdit}
                  aria-label="ویرایش نظر"
                  className="text-xs flex items-center gap-1 hover:opacity-80 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  ویرایش
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  aria-label="حذف نظر"
                  className="text-xs flex items-center gap-1 hover:opacity-80 font-medium"
                  style={{ color: 'var(--error)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </button>
              </>
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

      {/* B7 delete confirmation — same Modal pattern as blog/my */}
      <Modal isOpen={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)} title="حذف نظر">
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          آیا از حذف این نظر مطمئن هستید؟ پاسخ‌های این نظر هم حذف خواهند شد و این عمل قابل بازگشت نیست.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            انصراف
          </Button>
          <Button variant="danger" size="sm" onClick={deleteComment} isLoading={deleting}>
            حذف نظر
          </Button>
        </div>
      </Modal>
    </div>
  );
}
