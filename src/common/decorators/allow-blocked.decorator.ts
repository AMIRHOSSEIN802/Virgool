import { SetMetadata } from '@nestjs/common';

/**
 * Marks a single route as reachable by a BLOCKED user. AuthGuard still requires
 * a valid access token — only the `status === Block` rejection is skipped, and
 * only for handlers decorated with this (used by DELETE /user/account so a
 * blocked user can remove their own account). Never apply it to other routes.
 */
export const ALLOW_BLOCKED = 'ALLOW_BLOCKED';
export const AllowBlocked = () => SetMetadata(ALLOW_BLOCKED, true);
