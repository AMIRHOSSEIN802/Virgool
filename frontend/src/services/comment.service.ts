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

  async list(page = 1, limit = 10): Promise<{ pagination: PaginationMeta; comments: CommentEntity[] }> {
    const res = await api.get('/blog-comment', { params: { page, limit } });
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
};
