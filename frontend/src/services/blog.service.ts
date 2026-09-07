import api from '@/lib/api';
import type {
  CreateBlogDto,
  UpdateBlogDto,
  FilterBlogDto,
  BlogDetailResponse,
  BlogListBlog,
} from '@/types/blog.types';
import type { PaginationMeta } from '@/types/api.types';

export interface BlogListResponse {
  pagination: PaginationMeta;
  blogs: BlogListBlog[];
}

export const blogService = {
  async create(data: CreateBlogDto): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/blog', {
      title: data.title,
      slug: data.slug,
      time_for_study: data.time_for_study,
      description: data.description,
      content: data.content,
      categories: data.categories,
    });
    return res.data;
  },

  async list(filters: FilterBlogDto = {}): Promise<BlogListResponse> {
    const params: Record<string, string | number> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    const res = await api.get<BlogListResponse>('/blog', { params });
    return res.data;
  },

  async getMyBlogs(): Promise<BlogListBlog[]> {
    const res = await api.get<BlogListBlog[]>('/blog/my');
    return res.data;
  },

  async getBySlug(slug: string, page = 1, limit = 10): Promise<BlogDetailResponse> {
    const res = await api.get<BlogDetailResponse>(`/blog/by-slug/${slug}`, {
      params: { page, limit },
    });
    return res.data;
  },

  async toggleLike(id: number): Promise<{ message: string }> {
    const res = await api.get(`/blog/like/${id}`);
    return res.data;
  },

  async toggleBookmark(id: number): Promise<{ message: string }> {
    const res = await api.get(`/blog/bookmark/${id}`);
    return res.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const res = await api.delete(`/blog/${id}`);
    return res.data;
  },

  async update(id: number, data: UpdateBlogDto): Promise<{ message: string }> {
    const body: Record<string, unknown> = {};
    if (data.title) body.title = data.title;
    if (data.slug) body.slug = data.slug;
    if (data.time_for_study) body.time_for_study = data.time_for_study;
    if (data.description) body.description = data.description;
    if (data.content) body.content = data.content;
    if (data.categories) body.categories = data.categories;
    const res = await api.put<{ message: string }>(`/blog/${id}`, body);
    return res.data;
  },
};
