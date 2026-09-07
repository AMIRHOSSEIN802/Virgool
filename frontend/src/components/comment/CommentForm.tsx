'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { commentService } from '@/services/comment.service';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

interface CommentFormProps {
  blogId: number;
  parentId?: number;
  onCommentAdded?: () => void;
  onCancel?: () => void;
}

export default function CommentForm({ blogId, parentId, onCommentAdded, onCancel }: CommentFormProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (text.trim().length < 5) {
      toast.error('متن کامنت باید حداقل 5 کاراکتر باشد');
      return;
    }
    setIsLoading(true);
    try {
      await commentService.create({ text: text.trim(), blogId, parentId });
      toast.success('کامنت شما با موفقیت ارسال شد');
      setText('');
      onCommentAdded?.();
    } catch {
      toast.error('خطا در ارسال کامنت');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Avatar
        src={user?.profile?.image_profile}
        alt={user?.profile?.nick_name || user?.username || ''}
        size="sm"
      />
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={parentId ? 'پاسخ خود را بنویسید...' : 'نظر خود را بنویسید...'}
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
          style={{ border: '1px solid var(--border)', '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
          rows={parentId ? 2 : 3}
        />
        <div className="flex items-center gap-2 mt-2">
          <Button type="submit" size="sm" isLoading={isLoading} disabled={!text.trim()}>
            {parentId ? 'پاسخ' : 'ارسال'}
          </Button>
          {parentId && onCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              انصراف
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
