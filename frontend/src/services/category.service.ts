import api from '@/lib/api';
import type { CategoryEntity } from '@/types/category.types';
import type { PaginationMeta } from '@/types/api.types';

export const categoryService = {
  async list(page = 1, limit = 50): Promise<{ pagination: PaginationMeta; categories: CategoryEntity[] }> {
    const res = await api.get('/category', { params: { page, limit } });
    const data = res.data;
    return {
      pagination: data.pagination,
      categories: data.categpties ?? data.categories,
    };
  },

  async getById(id: number): Promise<CategoryEntity> {
    const res = await api.get(`/category/${id}`);
    return res.data;
  },

  async create(data: { title: string; priority?: number }): Promise<{ message: string }> {
    const res = await api.post('/category', data);
    return res.data;
  },

  async update(id: number, data: { title?: string; priority?: number }): Promise<{ message: string }> {
    const res = await api.patch(`/category/${id}`, data);
    return res.data;
  },

  async remove(id: number): Promise<{ message: string }> {
    const res = await api.delete(`/category/${id}`);
    return res.data;
  },
};
