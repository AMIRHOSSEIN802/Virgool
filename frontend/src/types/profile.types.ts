/** Public author profile returned by GET /user/by-username/:username */
export interface PublicProfile {
  id: number;
  username: string;
  role: 'admin' | 'user';
  profile: {
    nick_name: string;
    bio: string | null;
    image_profile: string | null;
    bg_image: string | null;
  };
  followersCount: number;
  followingCount: number;
  /** Whether the currently authenticated viewer follows this profile (false for guests). */
  isFollowing: boolean;
}
