import api from '@/lib/api';
import type { ImageEntity } from '@/types/image.types';

export const imageService = {
  async upload(
    file: File,
    name: string,
    alt?: string,
  ): Promise<{ message: string; image?: { id: number; location: string } }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    if (alt) formData.append('alt', alt);
    // multipart header is REQUIRED here: the shared axios client defaults to
    // application/json and axios would serialize FormData via formDataToJSON
    // (File → {}), which silently stores "{}" — see the profile upload fix.
    const res = await api.post<{ message: string; image?: { id: number; location: string } }>(
      '/image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  async list(): Promise<ImageEntity[]> {
    const res = await api.get<ImageEntity[]>('/image');
    return res.data;
  },

  async getById(id: number): Promise<ImageEntity> {
    const res = await api.get(`/image/${id}`);
    return res.data;
  },

  async remove(id: number): Promise<{ message: string }> {
    const res = await api.delete(`/image/${id}`);
    return res.data;
  },
};
