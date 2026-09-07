'use client';

import { useState } from 'react';
import { CommentEntity } from '@/types/blog.types';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import CommentForm from './CommentForm';
import Avatar from '@/components/ui/Avatar';
import { MessageCircle } from 'lucide-react';

interface CommentItemProps {
  comment: CommentEntity;
  blogId: number;
  onCommentAdded?: () => void;
}

export default function CommentItem({ comment, blogId, onCommentAdded }: CommentItemProps) {
  const { isAuthenticated } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showChildren, setShowChildren] = useState(true);

  const authorName = comment.user?.profile?.nick_name || comment.user?.username || 'کاربر';

  return (
    <div className="py-4">
      <div className="flex gap-3">
        <Avatar
          src={null}
          alt={authorName}
          size="sm"
          fallback={authorName}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{authorName}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{comment.text}</p>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs flex items-center gap-1 hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                پاسخ
              </button>
            )}
            {comment.children && comment.children.length > 0 && (
              <button
                onClick={() => setShowChildren(!showChildren)}
                className="text-xs hover:opacity-80"
                style={{ color: 'var(--primary)' }}
              >
                {showChildren ? 'مخفی کردن پاسخ‌ها' : `نمایش ${comment.children.length} پاسخ`}
              </button>
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

          {showChildren && comment.children && comment.children.length > 0 && (
            <div className="mt-3 mr-4 pr-4 space-y-3" style={{ borderRight: '2px solid var(--border)' }}>
              {comment.children.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  blogId={blogId}
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
