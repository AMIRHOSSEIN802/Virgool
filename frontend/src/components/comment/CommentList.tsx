'use client';

import { useState, useEffect } from 'react';
import { CommentEntity } from '@/types/blog.types';
import { commentService } from '@/services/comment.service';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface CommentListProps {
  blogId: number;
  comments: CommentEntity[];
  pagination: {
    page: number;
    pageCount: number;
    totalCount: number;
  };
  onRefresh?: () => void;
}

export default function CommentList({ blogId, comments: initialComments, pagination: initialPagination, onRefresh }: CommentListProps) {
  const [comments, setComments] = useState(initialComments);
  const [pagination, setPagination] = useState(initialPagination);

  useEffect(() => {
    setComments(initialComments);
    setPagination(initialPagination);
  }, [initialComments, initialPagination]);

  return (
    <div>
      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        نظرات ({pagination.totalCount})
      </h3>

      <CommentForm blogId={blogId} onCommentAdded={onRefresh} />

      <div>
        {comments.map((comment) => (
          <div key={comment.id} style={{ borderBottom: comments.indexOf(comment) < comments.length - 1 ? '1px solid var(--border)' : undefined }}>
            <CommentItem
              comment={comment}
              blogId={blogId}
              onCommentAdded={onRefresh}
            />
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <EmptyState title="نظری ثبت نشده" description="اولین نفری باشید که نظر می‌دهید" />
      )}
    </div>
  );
}
