export type AuthMethod = 'username' | 'email' | 'phone';
export type AuthType = 'login' | 'register';

export interface AuthDto {
  username: string;
  type: AuthType;
  method: AuthMethod;
}

export interface CheckOtpDto {
  code: string;
}

export interface AuthResponse {
  message: string;
  code?: string;
  accessToken?: string;
}

export interface UserEntity {
  id: number;
  username: string;
  phone: string | null;
  email: string | null;
  role: 'admin' | 'user';
  status: 'active' | 'block' | null;
  verify_email: boolean;
  verify_phone: boolean;
  profileId: number | null;
  profile: ProfileEntity | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileEntity {
  id: number;
  nick_name: string;
  bio: string | null;
  image_profile: string | null;
  bg_image: string | null;
  gender: string | null;
  birthday: string | null;
  linkedin_profile: string | null;
  x_profile: string | null;
  userId: number;
}

export interface ProfileWithCounts extends UserEntity {
  followersCount: number;
  followingCount: number;
}

export interface ProfileDto {
  nick_name: string;
  bio?: string;
  gender?: string;
  birthday?: string;
  linkedin_profile?: string;
  x_profile?: string;
  image_profile?: string;
  bg_image?: string;
}
