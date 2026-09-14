import api from '@/lib/api';
import type { PaginationMeta } from '@/types/api.types';

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'reply'
  | 'comment_accepted'
  | 'comment_rejected';

export interface NotificationActor {
  id: number;
  username: string;
  nick_name: string | null;
  image_profile: string | null;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  isRead: boolean;
  created_at: string;
  /** Slug for blog-targeted notifications (comment/like/reply/moderation). */
  blogSlug: string | null;
  commentId: number | null;
  actor: NotificationActor | null;
}

export interface NotificationListResponse {
  pagination: PaginationMeta;
  notifications: NotificationItem[];
}

export const notificationService = {
  async list(page = 1, limit = 10): Promise<NotificationListResponse> {
    const res = await api.get<NotificationListResponse>('/notification', {
      params: { page, limit },
    });
    return res.data;
  },

  async unreadCount(): Promise<number> {
    const res = await api.get<{ count: number }>('/notification/unread-count');
    return res.data.count;
  },

  async markRead(id: number): Promise<{ message: string }> {
    const res = await api.patch<{ message: string }>(`/notification/${id}/read`);
    return res.data;
  },

  async markAllRead(): Promise<{ message: string }> {
    const res = await api.patch<{ message: string }>('/notification/read-all');
    return res.data;
  },
};
