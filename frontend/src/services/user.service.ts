import api from '@/lib/api';
import type { ProfileDto, ProfileWithCounts } from '@/types/auth.types';
import type { PublicProfile } from '@/types/profile.types';
import type { FollowEntity } from '@/types/follow.types';
import type { UserListItem } from '@/types/follow.types';
import type { PaginationMeta } from '@/types/api.types';

export const userService = {
  async getProfile(): Promise<ProfileWithCounts> {
    const res = await api.get<ProfileWithCounts>('/user/profile');
    return res.data;
  },

  /** Public author profile — works for guests and authenticated viewers. */
  async getPublicProfile(username: string): Promise<PublicProfile> {
    const res = await api.get<PublicProfile>(
      `/user/by-username/${encodeURIComponent(username)}`
    );
    return res.data;
  },

  async updateProfile(data: ProfileDto): Promise<{ message: string }> {
    const formData = new FormData();
    if (data.nick_name) formData.append('nick_name', data.nick_name);
    if (data.bio) formData.append('bio', data.bio);
    if (data.gender) formData.append('gender', data.gender);
    if (data.birthday) formData.append('birthday', data.birthday);
    if (data.linkedin_profile) formData.append('linkedin_profile', data.linkedin_profile);
    if (data.x_profile) formData.append('x_profile', data.x_profile);
    // Content-Type is intentionally NOT set manually — the browser must generate
    // the multipart boundary. The shared axios client's JSON default is dropped
    // for FormData requests by axios itself.
    const res = await api.put<{ message: string }>('/user/profile', formData);
    return res.data;
  },

  async updateProfileImage(field: 'image_profile' | 'bg_image', file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append(field, file);
    const res = await api.put<{ message: string }>('/user/profile', formData);
    return res.data;
  },

  async listUsers(): Promise<UserListItem[]> {
    const res = await api.get<UserListItem[]>('/user/list');
    return res.data;
  },

  async getFollowers(page = 1, limit = 10): Promise<{ pagination: PaginationMeta; followers: FollowEntity[] }> {
    const res = await api.get('/user/followers', { params: { page, limit } });
    return res.data;
  },

  async getFollowing(page = 1, limit = 10): Promise<{ pagination: PaginationMeta; following: FollowEntity[] }> {
    const res = await api.get('/user/following', { params: { page, limit } });
    return res.data;
  },

  async toggleFollow(followingId: number): Promise<{ message: string }> {
    const res = await api.get(`/user/follow/${followingId}`);
    return res.data;
  },

  async changeEmail(email: string): Promise<{ message?: string; code?: string; token?: string }> {
    const res = await api.patch('/user/change-email', { email });
    return res.data;
  },

  async verifyEmailOtp(code: string): Promise<{ message: string }> {
    const res = await api.post('/user/verify-email-otp', { code });
    return res.data;
  },

  async changePhone(phone: string): Promise<{ message?: string; code?: string; token?: string }> {
    const res = await api.patch('/user/change-phone', { phone });
    return res.data;
  },

  async verifyPhoneOtp(code: string): Promise<{ message: string }> {
    const res = await api.post('/user/verify-phone-otp', { code });
    return res.data;
  },

  async changeUsername(username: string): Promise<{ message: string }> {
    const res = await api.patch('/user/change-username', { username });
    return res.data;
  },

  async blockUser(userId: number): Promise<{ message: string }> {
    const res = await api.post('/user/block', { userId });
    return res.data;
  },
};
