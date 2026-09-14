import api from '@/lib/api';
import type { CreateCommentDto, CommentEntity } from '@/types/blog.types';
import type { PaginationMeta } from '@/types/api.types';

export const commentService = {
  async create(data: CreateCommentDto): Promise<{ message: string }> {
    const payload: Record<string, string> = {
      text: data.text,
      blogId: String(data.blogId),
    };
    if (data.parentId != null) {
      payload.parentId = String(data.parentId);
    }
    const res = await api.post<{ message: string }>('/blog-comment', payload);
    return res.data;
  },

  /**
   * Admin comments list (GET /blog-comment — admin-only), with moderation
   * filter: 'accepted' | 'rejected' | undefined (all).
   */
  async list(
    page = 1,
    limit = 10,
    accepted?: 'accepted' | 'rejected',
  ): Promise<{ pagination: PaginationMeta; comments: CommentEntity[] }> {
    const params: Record<string, string | number> = { page, limit };
    if (accepted === 'accepted') params.accepted = 'true';
    else if (accepted === 'rejected') params.accepted = 'false';
    const res = await api.get('/blog-comment', { params });
    return res.data;
  },

  async accept(id: number): Promise<{ message: string }> {
    const res = await api.put(`/blog-comment/accept/${id}`);
    return res.data;
  },

  async reject(id: number): Promise<{ message: string }> {
    const res = await api.put(`/blog-comment/reject/${id}`);
    return res.data;
  },

  /** B7: author-only edit. Backend derives ownership from the DB record. */
  async update(id: number, text: string): Promise<{ message: string }> {
    const res = await api.put<{ message: string }>(`/blog-comment/${id}`, { text });
    return res.data;
  },

  /** B7: author-only delete. Replies cascade at the DB level. */
  async remove(id: number): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/blog-comment/${id}`);
    return res.data;
  },
};
