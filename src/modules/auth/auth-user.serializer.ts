import { UserEntity } from '../user/entities/user.entity';

/**
 * R-05 — check-login response hygiene.
 *
 * `req.user` is a full UserEntity (password, otpId, new_email, new_Phone and
 * relations). The frontend only needs identity/routing fields, so the endpoint
 * returns an explicit whitelist instead of the raw row — every internal field
 * is excluded by construction, not by hoping nobody adds a column.
 */
export type AuthenticatedUserResponse = {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: UserEntity['role'];
  status: UserEntity['status'];
  verify_email: boolean;
  verify_phone: boolean;
  profileId: number | null;
  created_at: Date;
  updated_at: Date;
};

export function serializeAuthenticatedUser(
  user: UserEntity,
): AuthenticatedUserResponse {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    verify_email: user.verify_email,
    verify_phone: user.verify_phone,
    profileId: user.profileId,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
