export interface FollowEntity {
  id: number;
  followingId: number;
  followerId: number;
  created_at: string;
  follower?: {
    id: number;
    username: string;
    profile?: {
      id: number;
      nick_name: string;
      bio: string | null;
      image_profile: string | null;
      bg_image: string | null;
    };
  };
  following?: {
    id: number;
    username: string;
    profile?: {
      id: number;
      nick_name: string;
      bio: string | null;
      image_profile: string | null;
      bg_image: string | null;
    };
  };
}

export interface UserListItem {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'user';
  status: 'active' | 'block' | null;
  created_at?: string;
  profile?: {
    nick_name: string;
    image_profile: string | null;
  };
}

/** GET /user/list (admin-only): paginated, whitelisted columns only. */
export interface AdminUsersResponse {
  pagination: import('./api.types').PaginationMeta;
  users: UserListItem[];
}
